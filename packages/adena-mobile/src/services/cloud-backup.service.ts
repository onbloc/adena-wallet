import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { AppError, AppErrorCode, isAppError } from '../core/errors';
import { KeyringRecord, KeyringType } from '../crypto/keyring';
import { Account, isAvatarColor } from '../domain/account';
import { CloudBackupState, CloudBackupStateRepository } from '../repositories/cloud-backup/backup-state.repository';
import { backupFileName, backupVersionFileName, CloudBackupFile, CloudBackupProvider, CloudBackupStore, parseBackupFileName } from '../repositories/cloud-backup/cloud-backup-store';
import { BACKUP_VERSION, BackupAccount, BackupCodec, BackupContent, BackupHeader, BackupKeyring, headerOf, PLACEHOLDER_ACCOUNT_VERSION } from '../security/backup-codec';
import { BACKUP_PASSWORD_ISSUE_MESSAGE, findBackupPasswordIssue } from '../security/password-policy';
import { createId, randomBytes } from '../utils/id';
import { SerialQueue } from '../utils/serial-queue';
import { AccountService } from './account.service';
import { PasswordAttemptLimiter } from './password-attempt-limiter';
import { VaultService } from './vault.service';
import { WalletService } from './wallet.service';

// How the cloud copy differs from the one this device last wrote or restored.
export const RemoteChange = {
  // Written by another device (or a newer app) since.
  UPDATED_ELSEWHERE: 'updatedElsewhere',
  // Older than the last copy this device knew: restored from a cloud snapshot or replaced with an old file.
  ROLLED_BACK: 'rolledBack',
  // Cannot be read without the password check failing; replacing it is the only fix.
  UNREADABLE: 'unreadable',
} as const;

export type RemoteChange = (typeof RemoteChange)[keyof typeof RemoteChange];

export type CloudBackupStatus
  = | { kind: 'none' }
    | {
      kind: 'backedUp';
      fileName: string;
      backedUpAt: number;
      outdated: boolean;
      mnemonicCount: number;
      privateKeyCount: number;
      // Only set by getStatus, which reads the cloud copy.
      remoteChange?: RemoteChange;
    };

export interface RestorableBackup {
  fileName: string;
  modifiedAt: number;
  // The backup this device last wrote or restored.
  current: boolean;
}

export interface CreateBackupInput {
  walletPassword: string;
  backupPassword: string;
  confirmPassword: string;
  // Replaces a cloud copy changed elsewhere; without it such a write fails with BACKUP_CONFLICT.
  overwrite?: boolean;
}

export const BACKUP_PASSWORD_SAME_AS_WALLET = 'Use a different password from your wallet password';

const CONFLICT_MESSAGE: Record<RemoteChange, string> = {
  updatedElsewhere: 'This backup was updated on another device. Backing up now replaces that version.',
  rolledBack: 'The backup in the cloud is older than the last one made on this device. Backing up now replaces it.',
  unreadable: 'The backup in the cloud cannot be read. Backing up now replaces it.',
};

const corrupted = (detail: string): AppError => new AppError(AppErrorCode.BACKUP_CORRUPTED, `This backup file is damaged (${detail}).`);

// One cloud file of a backup: its plaintext header, or the change when no header can be read.
interface RemoteVersion {
  name: string;
  modifiedAt: number;
  // From the file name; null for the single-file format.
  nameRevision: number | null;
  header: BackupHeader | RemoteChange;
}

// The file each opened backup was read from, so a restore records the real file name.
const openedFiles = new WeakMap<BackupContent, string>();

// Encrypted wallet backup in the user's own cloud. The backup password never leaves memory and is
// never stored; nothing is uploaded without it, so account changes only mark the backup outdated.
// Each write bumps a revision kept in the file header (bound to the encrypted copy) and goes to a new file,
// so a copy written by another device or rolled back is reported and never overwritten.
export class CloudBackupService {
  private readonly queue = new SerialQueue();

  constructor(
    private readonly store: CloudBackupStore,
    private readonly codec: BackupCodec,
    private readonly stateRepository: CloudBackupStateRepository,
    private readonly vaultService: VaultService,
    private readonly accountService: AccountService,
    private readonly walletService: WalletService,
    private readonly restoreLimiter: PasswordAttemptLimiter,
    private readonly now: () => number = Date.now,
  ) {}

  get provider(): CloudBackupProvider {
    return this.store.provider;
  }

  isAvailable(): Promise<boolean> {
    return this.store.isAvailable().catch(() => false);
  }

  // Local view only (no network): what this device last backed up and whether accounts changed since.
  getLocalStatus(): CloudBackupStatus {
    const state = this.stateRepository.get();

    if (!state) {
      return { kind: 'none' };
    }

    return {
      kind: 'backedUp',
      fileName: state.fileName,
      backedUpAt: state.backedUpAt,
      outdated: state.fingerprint !== fingerprintOf(this.accountService.getAccounts()),
      mnemonicCount: state.mnemonicCount,
      privateKeyCount: state.privateKeyCount,
    };
  }

  // Confirms the recorded backup still exists in the cloud and is the copy this device knows.
  async getStatus(options: { interactive?: boolean } = {}): Promise<CloudBackupStatus> {
    let state = this.stateRepository.get();
    const pending = this.pendingWriteFor(state);
    const known = state ?? pending;

    if (!known) {
      return { kind: 'none' };
    }

    if (options.interactive) {
      await this.store.signIn();
    }

    const versions = await this.readVersions(known.backupId);

    if (versions.length === 0) {
      this.stateRepository.clear();
      return { kind: 'none' };
    }

    state = this.adoptPendingWrite(pending, versions) ?? state;

    if (!state) {
      return { kind: 'none' };
    }

    const remoteChange = compareVersions(state, versions);

    return { ...this.getLocalStatus(), ...(remoteChange && { remoteChange }) };
  }

  // Same attempt limit as every other wallet password prompt.
  verifyWalletPassword(password: string): Promise<void> {
    return this.vaultService.verifyPassword(password);
  }

  // Stricter than the wallet password (the file faces offline guessing), and must differ from it.
  findBackupPasswordIssue(backupPassword: string, confirmPassword: string, walletPassword?: string): string | null {
    const issue = findBackupPasswordIssue(backupPassword, { confirm: confirmPassword });

    if (issue) {
      return BACKUP_PASSWORD_ISSUE_MESSAGE[issue];
    }

    return walletPassword !== undefined && backupPassword === walletPassword ? BACKUP_PASSWORD_SAME_AS_WALLET : null;
  }

  // Creates the backup, or replaces this device's existing one with the current keyrings.
  createBackup({ walletPassword, backupPassword, confirmPassword, overwrite = false }: CreateBackupInput): Promise<CloudBackupStatus> {
    const issue = this.findBackupPasswordIssue(backupPassword, confirmPassword, walletPassword);

    if (issue) {
      return Promise.reject(new AppError(AppErrorCode.WEAK_PASSWORD, issue));
    }

    return this.queue.run(async () => {
      await this.store.signIn();
      const saved = this.stateRepository.get();
      const pending = this.pendingWriteFor(saved);
      // A first backup whose write was never confirmed keeps its backupId, so a retry leaves no orphan file.
      const backupId = saved?.backupId ?? pending?.backupId ?? createId();
      const versions = saved || pending ? await this.readVersions(backupId) : [];
      const previous = this.adoptPendingWrite(pending, versions) ?? saved;
      const reference = previous ?? pending;

      if (reference && versions.length > 0) {
        const change = compareVersions(reference, versions);

        if (change && !overwrite) {
          throw new AppError(AppErrorCode.BACKUP_CONFLICT, CONFLICT_MESSAGE[change]);
        }
      }

      // The newest stored version is kept when older ones are pruned, even if this device knew a later one.
      const newestStored = Math.max(0, ...versions.map(knownRevision).filter(revision => revision !== null));
      const revision = previous || versions.length > 0 ? Math.max(previous?.revision ?? 0, newestStored) + 1 : 1;
      const fileName = backupVersionFileName(backupId, revision, bytesToHex(randomBytes(8)));
      const { content, fingerprint } = await this.snapshot(walletPassword, backupId, revision);
      const encoded = await this.codec.encode(content, backupPassword);
      const next: CloudBackupState = { backupId, fileName, backedUpAt: content.createdAt, revision, fingerprint, ...countKeyrings(content.keyrings) };

      this.stateRepository.savePendingWrite(next);
      await this.store.write(fileName, encoded);
      this.stateRepository.save(next);
      this.stateRepository.clearPendingWrite();
      await this.pruneVersions(next, versions, newestStored);

      return this.getLocalStatus();
    });
  }

  // Removes one Adena backup (every stored version of it) from the cloud; the wallet on this device is untouched.
  // While a wallet exists the wallet password is required; before setup the caller must have confirmed the deletion explicitly.
  deleteBackup(fileName: string, options: { walletPassword?: string } = {}): Promise<void> {
    const backupId = parseBackupFileName(fileName)?.backupId;

    if (backupId === undefined) {
      return Promise.reject(new AppError(AppErrorCode.INVALID_REQUEST, 'Invalid backup file name'));
    }

    return this.queue.run(async () => {
      if (await this.vaultService.exists()) {
        if (options.walletPassword === undefined) {
          throw new AppError(AppErrorCode.INVALID_REQUEST, 'Enter your wallet password to delete a backup');
        }

        await this.vaultService.verifyPassword(options.walletPassword);
      }

      await this.store.signIn();
      const names = new Set([fileName, ...versionFilesOf(await this.store.list(), backupId).map(file => file.name)]);

      for (const name of names) {
        try {
          await this.store.remove(name);
        }
        catch (error) {
          if (!isAppError(error, AppErrorCode.BACKUP_NOT_FOUND)) {
            throw error;
          }
        }
      }

      if (this.stateRepository.get()?.backupId === backupId) {
        this.stateRepository.clear();
      }

      if (this.stateRepository.getPendingWrite()?.backupId === backupId) {
        this.stateRepository.clearPendingWrite();
      }
    });
  }

  // One entry per backup, pointing at its newest readable version; newest first.
  // Without `interactive`, Google Drive fails with CLOUD_BACKUP_NOT_SIGNED_IN until access is granted.
  async findBackups(options: { interactive?: boolean } = {}): Promise<RestorableBackup[]> {
    if (options.interactive) {
      await this.store.signIn();
    }

    const files = await this.store.list();
    const backupIds = new Set(files.map(file => parseBackupFileName(file.name)?.backupId).filter(id => id !== undefined));
    const currentBackupId = this.stateRepository.get()?.backupId;
    const backups: RestorableBackup[] = [];

    for (const backupId of backupIds) {
      const group = versionFilesOf(files, backupId);
      const newest = group.length === 1 ? group[0] : newestVersion(await this.readVersionsOf(group, backupId)) ?? newestFile(group);

      backups.push({ fileName: newest.name, modifiedAt: newest.modifiedAt, current: backupId === currentBackupId });
    }

    return backups.sort((a, b) => b.modifiedAt - a.modifiedAt);
  }

  // Throttled like the wallet password, with its own counter that a factory reset keeps.
  async openBackup(fileName: string, backupPassword: string): Promise<BackupContent> {
    const raw = await this.store.read(fileName);
    // Fails fast on a damaged or renamed file instead of counting it as a wrong password.
    const envelope = this.codec.parseEnvelope(raw);
    const parts = parseBackupFileName(fileName);

    if (parts?.backupId !== envelope.backupId || (parts.revision !== null && parts.revision !== headerOf(envelope).revision)) {
      throw corrupted('file name');
    }

    const content = await this.restoreLimiter.run(() => this.codec.decode(raw, backupPassword));

    openedFiles.set(content, fileName);
    return content;
  }

  // Rebuilds the wallet through WalletService, then records the backup as current for this device.
  // A keyring without account rows gets index 0 there, unless its key already has an account.
  async restoreWallet(content: BackupContent, walletPassword: string): Promise<Account> {
    const keyrings: KeyringRecord[] = content.keyrings.map(toKeyringRecord);
    const accounts = content.keyrings
      .flatMap(keyring => accountRowsOf(keyring, content.version).map(account => ({ keyringId: keyring.id, account })))
      .map((entry, order) => ({ ...entry, order: entry.account.position ?? order }))
      .sort((a, b) => a.order - b.order)
      .map(({ keyringId, account }) => ({
        keyringId,
        name: account.name,
        hdIndex: account.hdIndex,
        ...(isAvatarColor(account.avatarColor) && { avatarColor: account.avatarColor }),
      }));
    // Saved inside the restore, so an interrupted one leaves neither a partial wallet nor a stale status.
    const saveState = (): void => this.stateRepository.save({
      backupId: content.backupId,
      fileName: openedFiles.get(content) ?? backupFileName(content.backupId),
      backedUpAt: content.createdAt,
      revision: content.revision,
      fingerprint: fingerprintOf(this.accountService.getAccounts()),
      ...countKeyrings(content.keyrings),
    });

    return this.walletService.restoreWallet({ keyrings, accounts, selected: content.selected, password: walletPassword, backupId: content.backupId, onRestored: saveState });
  }

  // A pending write only counts for the backup this device tracks (or for a first backup).
  private pendingWriteFor(state: CloudBackupState | null): CloudBackupState | null {
    const pending = this.stateRepository.getPendingWrite();

    return pending && (!state || pending.backupId === state.backupId) ? pending : null;
  }

  // A cloud copy matching the pending write is this device's own write that outlived a JS timeout.
  private adoptPendingWrite(pending: CloudBackupState | null, versions: RemoteVersion[]): CloudBackupState | null {
    if (!pending || !versions.some(version => matches(pending, version.header))) {
      return null;
    }

    this.stateRepository.save(pending);
    this.stateRepository.clearPendingWrite();
    return pending;
  }

  // Every stored version of a backup; files gone between listing and reading are skipped.
  private async readVersions(backupId: string): Promise<RemoteVersion[]> {
    return this.readVersionsOf(versionFilesOf(await this.store.list(), backupId), backupId);
  }

  private async readVersionsOf(files: CloudBackupFile[], backupId: string): Promise<RemoteVersion[]> {
    const versions: RemoteVersion[] = [];

    for (const file of files) {
      const nameRevision = parseBackupFileName(file.name)?.revision ?? null;
      const header = await this.readRemoteHeader(file.name);

      if (header !== null) {
        // A header that disagrees with its file name was copied or renamed.
        const consistent = typeof header === 'string' || (header.backupId === backupId && (nameRevision === null || header.revision === nameRevision));

        versions.push({ name: file.name, modifiedAt: file.modifiedAt, nameRevision, header: consistent ? header : RemoteChange.UNREADABLE });
      }
    }

    return versions;
  }

  // Once the new version reads back, drops versions older than the newest one it replaced, which stays as a fallback.
  // Only files seen before the write are touched, so a version another device wrote meanwhile survives.
  private async pruneVersions(written: CloudBackupState, seen: RemoteVersion[], keepFrom: number): Promise<void> {
    try {
      const header = await this.readRemoteHeader(written.fileName);

      if (header === null || !matches(written, header)) {
        return;
      }

      for (const version of seen) {
        const revision = knownRevision(version);
        // A damaged single-file copy has no known revision; replacing it needed an explicit overwrite.
        const superseded = revision === null ? version.header === RemoteChange.UNREADABLE : revision < keepFrom;

        if (superseded) {
          await this.store.remove(version.name);
        }
      }
    }
    catch {
      // The new version is stored; leftovers are pruned by the next write.
    }
  }

  // The plaintext header of a cloud file, null when it is gone, or the change when no header can be read.
  private async readRemoteHeader(fileName: string): Promise<BackupHeader | RemoteChange | null> {
    let raw: string;

    try {
      raw = await this.store.read(fileName);
    }
    catch (error) {
      if (isAppError(error, AppErrorCode.BACKUP_NOT_FOUND)) {
        return null;
      }

      throw error;
    }

    try {
      return headerOf(this.codec.parseEnvelope(raw));
    }
    catch (error) {
      if (isAppError(error, AppErrorCode.BACKUP_UNSUPPORTED_VERSION)) {
        // Written by a newer app, so by another install.
        return RemoteChange.UPDATED_ELSEWHERE;
      }

      if (isAppError(error, AppErrorCode.BACKUP_CORRUPTED)) {
        return RemoteChange.UNREADABLE;
      }

      throw error;
    }
  }

  // Keyrings and accounts are read together on the account queue, so the backup matches one consistent state.
  private snapshot(walletPassword: string, backupId: string, revision: number): Promise<{ content: BackupContent; fingerprint: string }> {
    return this.accountService.runExclusive(async () => {
      const vault = await this.vaultService.open(walletPassword);
      const accounts = this.accountService.getAccounts();
      const keyrings = vault.keyrings.map(record => toBackupKeyring(record, accounts));
      const current = this.accountService.getCurrentAccount();
      const selected = current && keyrings.some(keyring => keyring.id === current.keyringId && keyring.accounts.some(account => account.hdIndex === current.hdIndex))
        ? { keyringId: current.keyringId, hdIndex: current.hdIndex }
        : undefined;

      assignPositions(keyrings, accounts);

      return {
        content: {
          version: BACKUP_VERSION,
          backupId,
          createdAt: this.now(),
          revision,
          ...(selected && { selected }),
          keyrings,
        },
        fingerprint: fingerprintOf(accounts),
      };
    });
  }
}

// Whether a cloud version is exactly the one this device last wrote or restored.
const matches = (state: CloudBackupState, header: BackupHeader | RemoteChange): boolean =>
  typeof header !== 'string' && header.revision === state.revision && header.createdAt === state.backedUpAt && header.backupId === state.backupId;

// Null when this device's version is present and nothing at or past its revision was written elsewhere.
// Older versions are the ones it replaced. Two writes of the same revision both survive and show up here.
const compareVersions = (state: CloudBackupState, versions: RemoteVersion[]): RemoteChange | null => {
  let own = false;
  let newer = false;
  let unreadable = false;

  for (const version of versions) {
    const { header } = version;

    if (typeof header === 'string') {
      if (version.nameRevision === null || version.nameRevision >= state.revision) {
        newer ||= header === RemoteChange.UPDATED_ELSEWHERE;
        unreadable ||= header !== RemoteChange.UPDATED_ELSEWHERE;
      }
    }
    else if (matches(state, header)) {
      own = true;
    }
    else if (header.revision >= state.revision) {
      newer = true;
    }
  }

  if (newer) {
    return RemoteChange.UPDATED_ELSEWHERE;
  }

  if (unreadable) {
    return RemoteChange.UNREADABLE;
  }

  return own ? null : RemoteChange.ROLLED_BACK;
};

const knownRevision = (version: RemoteVersion): number | null =>
  typeof version.header === 'string' ? version.nameRevision : version.header.revision;

const versionFilesOf = (files: CloudBackupFile[], backupId: string): CloudBackupFile[] =>
  files.filter(file => parseBackupFileName(file.name)?.backupId === backupId);

// The readable version with the highest revision; the later write breaks a tie.
const newestVersion = (versions: RemoteVersion[]): RemoteVersion | undefined => versions
  .filter(version => typeof version.header !== 'string')
  .sort((a, b) => (b.header as BackupHeader).revision - (a.header as BackupHeader).revision || b.modifiedAt - a.modifiedAt)[0];

const newestFile = (files: CloudBackupFile[]): CloudBackupFile => [...files].sort((a, b) => b.modifiedAt - a.modifiedAt)[0];

// Changes when a keyring or account index is added or removed; renames do not count.
export const fingerprintOf = (accounts: Account[]): string => {
  const layout = accounts.map(account => `${account.keyringId}:${account.hdIndex}`).sort().join('\n');

  return bytesToHex(sha256(new TextEncoder().encode(layout)));
};

const countKeyrings = (keyrings: BackupKeyring[]): Pick<CloudBackupState, 'mnemonicCount' | 'privateKeyCount'> => ({
  mnemonicCount: keyrings.filter(keyring => keyring.type === KeyringType.HD_WALLET).length,
  privateKeyCount: keyrings.filter(keyring => keyring.type === KeyringType.PRIVATE_KEY).length,
});

// Display positions follow the account list.
const assignPositions = (keyrings: BackupKeyring[], accounts: Account[]): void => {
  const order = new Map(accounts.map((account, index) => [`${account.keyringId}:${account.hdIndex}`, index]));

  keyrings
    .flatMap(keyring => keyring.accounts.map(account => ({ account, rank: order.get(`${keyring.id}:${account.hdIndex}`) ?? Number.MAX_SAFE_INTEGER })))
    .sort((a, b) => a.rank - b.rank)
    .forEach((entry, position) => {
      entry.account.position = position;
    });
};

// The cached seed is left out: it is derivable from the mnemonic and would only enlarge the secret.
const toBackupKeyring = (record: KeyringRecord, accounts: Account[]): BackupKeyring => {
  const owned: BackupAccount[] = accounts
    .filter(account => account.keyringId === record.id)
    .sort((a, b) => a.hdIndex - b.hdIndex)
    .map(account => ({ name: account.name, hdIndex: account.hdIndex, ...(account.avatarColor && { avatarColor: account.avatarColor }) }));

  return record.type === KeyringType.HD_WALLET
    ? { id: record.id, type: record.type, mnemonic: record.mnemonic, createdAt: record.createdAt, accounts: owned }
    : { id: record.id, type: record.type, privateKey: record.privateKey, createdAt: record.createdAt, accounts: owned };
};

// Older files stood in for a keyring without accounts with an unnamed index-0 row; it is not a real account.
const accountRowsOf = (keyring: BackupKeyring, version: number): BackupAccount[] => {
  const [only] = keyring.accounts;
  const placeholder = version <= PLACEHOLDER_ACCOUNT_VERSION && keyring.accounts.length === 1 && only.name === '' && only.hdIndex === 0;

  return placeholder ? [] : keyring.accounts;
};

const toKeyringRecord = (keyring: BackupKeyring): KeyringRecord =>
  keyring.type === KeyringType.HD_WALLET
    ? { id: keyring.id, type: keyring.type, mnemonic: keyring.mnemonic, createdAt: keyring.createdAt }
    : { id: keyring.id, type: keyring.type, privateKey: keyring.privateKey, createdAt: keyring.createdAt };
