import { fromHex, toBase64 } from '@cosmjs/encoding';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import { APP_CONFIG } from '../config/app';
import { AppError, AppErrorCode, BIOMETRICS_INVALIDATED_MESSAGE, isAppError } from '../core/errors';
import { deriveKeyPair, isHdIndex, keyPairFromPrivateKey, wipeKeyPair } from '../crypto/key-pair';
import { isValidPrivateKeyHex, KeyringRecord, KeyringType } from '../crypto/keyring';
import { generateMnemonic, isValidMnemonic, mnemonicToSeed, normalizeMnemonic } from '../crypto/mnemonic';
import { Account, AvatarColor } from '../domain/account';
import { VaultContent } from '../migration/vault-migrations';
import { BiometricCredentialRepository } from '../repositories/biometric-credential.repository';
import { PreferenceRepository } from '../repositories/preference.repository';
import { findPasswordIssue, PASSWORD_ISSUE_MESSAGE } from '../security/password-policy';
import { BiometryKind, SecurePrompt } from '../security/secure-store';
import { createId } from '../utils/id';
import { AccountService } from './account.service';
import { KeyringSession } from './keyring-session';
import { ResetMarker } from './reset-marker';
import { RestoreMarker } from './restore-marker';
import { VaultService } from './vault.service';

// Any store that keeps data per account and must drop it when the account is removed.
export interface AccountScopedData {
  removeAccount(accountId: string): void;
}

export const WalletStatus = {
  EMPTY: 'empty',
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
} as const;

export type WalletStatus = (typeof WalletStatus)[keyof typeof WalletStatus];

export const ENABLE_BIOMETRICS_PROMPT: SecurePrompt = {
  title: 'Enable biometric unlock',
  subtitle: 'Confirm to unlock Adena with biometrics',
  cancel: 'Not now',
};

// The password a wallet was just created with, as a digest, valid only for that session and vault write.
interface CreatedWithPassword {
  digest: string;
  epoch: number;
  vaultRevision: number;
}

const digestPassword = (password: string): string => bytesToHex(sha256(utf8ToBytes(password)));

export interface CreateWalletInput {
  mnemonic: string;
  password: string;
  accountName?: string;
  // HD indexes to add, in order (e.g. picked on the import account list); defaults to index 0.
  hdIndexes?: number[];
}

export interface RestoreWalletInput {
  keyrings: KeyringRecord[];
  // Accounts in display order.
  accounts: { keyringId: string; name: string; hdIndex: number; avatarColor?: AvatarColor }[];
  // Falls back to the first account when missing or not restored.
  selected?: { keyringId: string; hdIndex: number };
  password: string;
  // Recorded in the restore marker; the backup this restore comes from.
  backupId?: string;
  // Runs before the restore counts as finished (e.g. saving the backup status); a throw undoes the restore.
  onRestored?: () => void;
}

// Local records a restore writes besides the vault and accounts, such as the cloud backup status.
export interface RestoreScopedData {
  // Null drops the records of every backup.
  forgetBackup(backupId: string | null): void;
}

// Wallet lifecycle: create/import, lock/unlock, biometrics and keyring management.
// Keyring and account changes run on AccountService's mutation queue, so duplicate checks,
// index allocation and keyring removal see each other.
export class WalletService {
  private createdWith: CreatedWithPassword | null = null;

  constructor(
    private readonly vaultService: VaultService,
    private readonly keyringSession: KeyringSession,
    private readonly accountService: AccountService,
    private readonly accountScopedData: AccountScopedData[],
    private readonly biometricRepository: BiometricCredentialRepository,
    private readonly preferenceRepository: PreferenceRepository,
    private readonly resetMarker?: ResetMarker,
    private readonly restoreMarker?: RestoreMarker,
    private readonly restoreScopedData?: RestoreScopedData,
  ) {}

  async getStatus(): Promise<WalletStatus> {
    // An unfinished reset stays on the lock screen, where the reset can be retried.
    if (this.resetMarker?.isPending()) {
      return WalletStatus.LOCKED;
    }

    if (this.restoreMarker?.isPending()) {
      await this.rollBackInterruptedRestore();
    }

    if (!(await this.vaultService.exists())) {
      return WalletStatus.EMPTY;
    }

    return this.keyringSession.isUnlocked() ? WalletStatus.UNLOCKED : WalletStatus.LOCKED;
  }

  generateMnemonic(): string {
    return generateMnemonic(APP_CONFIG.mnemonicStrength);
  }

  // Same rules as the extension: 8~256 characters and a zxcvbn score of 2 or more.
  validatePassword(password: string): void {
    const issue = findPasswordIssue(password);

    if (issue) {
      throw new AppError(AppErrorCode.WEAK_PASSWORD, PASSWORD_ISSUE_MESSAGE[issue]);
    }
  }

  async createWallet({ mnemonic, password, accountName, hdIndexes }: CreateWalletInput): Promise<Account> {
    if (!isValidMnemonic(mnemonic)) {
      throw new AppError(AppErrorCode.INVALID_MNEMONIC, 'Invalid recovery phrase');
    }

    const indexes = hdIndexes?.length ? hdIndexes : [0];

    if (indexes.some(index => !isHdIndex(index)) || new Set(indexes).size !== indexes.length) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Invalid account index');
    }

    this.validatePassword(password);
    const record: KeyringRecord = {
      id: createId(),
      type: KeyringType.HD_WALLET,
      mnemonic: normalizeMnemonic(mnemonic),
      createdAt: Date.now(),
    };
    const epoch = this.keyringSession.epoch;

    return this.accountService.runExclusive(async () => {
      // Checked before writing too: a create queued before a reset must not recreate the vault.
      this.assertCurrent(epoch);
      const content = await this.vaultService.create([record], password);

      this.assertCurrentOrForget(epoch);
      this.accountService.clear();
      this.keyringSession.open(content.keyrings);
      this.createdWith = { digest: digestPassword(password), epoch: this.keyringSession.epoch, vaultRevision: this.vaultService.revision };
      const [first, ...rest] = indexes;
      // Named by index, so a name matches the account picked on the import list.
      const account = await this.accountService.appendAccount(record.id, record.type, accountName ?? `Account ${first + 1}`, { hdIndex: first });

      for (const hdIndex of rest) {
        await this.accountService.appendAccount(record.id, record.type, `Account ${hdIndex + 1}`, { hdIndex });
      }

      return account;
    });
  }

  // Rebuilds a wallet from a decrypted backup: one new vault holding every keyring, then each account at its index.
  // All or nothing: if any account cannot be rebuilt, the new vault is removed again.
  restoreWallet({ keyrings, accounts, selected, password, backupId, onRestored }: RestoreWalletInput): Promise<Account> {
    this.validateRestoreInput(keyrings, accounts);
    this.validatePassword(password);
    const epoch = this.keyringSession.epoch;

    return this.accountService.runExclusive(async () => {
      this.assertCurrent(epoch);

      // Checked before the marker is set, so a launch-time rollback can never remove a wallet that was already here.
      if (await this.vaultService.exists()) {
        throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'A wallet already exists on this device');
      }

      // Whatever a previous wallet left behind is dropped, so a rollback only removes what this restore wrote.
      this.restoreScopedData?.forgetBackup(null);
      this.restoreMarker?.markPending(backupId ?? null);
      let content: VaultContent;

      try {
        content = await this.vaultService.create(keyrings, password);
      }
      catch (error) {
        // Another wallet got there first and nothing was written: that vault must stay.
        if (isAppError(error, AppErrorCode.WALLET_ALREADY_EXISTS)) {
          this.restoreMarker?.clear();
          throw error;
        }

        // A failed second slot write still leaves a readable vault, so it is undone like a later failure.
        await this.undoRestore().catch(() => undefined);
        throw error;
      }

      try {
        this.assertCurrent(epoch);
        this.accountService.clear();
        this.keyringSession.open(content.keyrings);
        const types = new Map(keyrings.map(keyring => [keyring.id, keyring.type]));
        const restored: Account[] = [];

        for (const account of accounts) {
          // A backed-up account without a color keeps the default instead of getting a random one.
          restored.push(await this.accountService.appendAccount(account.keyringId, types.get(account.keyringId)!, account.name, { hdIndex: account.hdIndex, avatarColor: account.avatarColor ?? null }));
        }

        await this.restoreMissingAccounts(content.keyrings);
        const current = restored.find(account => account.keyringId === selected?.keyringId && account.hdIndex === selected.hdIndex)
          ?? restored[0]
          ?? this.accountService.getAccounts()[0];
        const selectedAccount = this.accountService.selectAccount(current.id);

        onRestored?.();
        this.restoreMarker?.clear();
        // Like createWallet, enabling biometrics right after the restore can skip another scrypt run.
        this.createdWith = { digest: digestPassword(password), epoch: this.keyringSession.epoch, vaultRevision: this.vaultService.revision };
        return selectedAccount;
      }
      catch (error) {
        // The restore error is what the user needs to see; a failed cleanup keeps the marker for the next launch.
        await this.undoRestore().catch(() => undefined);
        throw error;
      }
    });
  }

  // The backup cannot be read again without its password, so a restore cut short is undone
  // and the app returns to onboarding. Queued behind a restore still running in this JS runtime, in any root.
  private rollBackInterruptedRestore(): Promise<void> {
    return this.accountService.runExclusive(async () => {
      if (this.restoreMarker?.isPending()) {
        await this.undoRestore();
      }
    });
  }

  // Removes a restore's vault (both slots), partial accounts and backup status; the marker is cleared only once that worked.
  private async undoRestore(): Promise<void> {
    this.createdWith = null;
    this.keyringSession.close();
    this.accountService.clear();
    await this.vaultService.destroy();
    this.restoreScopedData?.forgetBackup(this.restoreMarker?.getBackupId() ?? null);
    this.restoreMarker?.clear();
  }

  private validateRestoreInput(keyrings: KeyringRecord[], accounts: RestoreWalletInput['accounts']): void {
    const ids = new Set(keyrings.map(keyring => keyring.id));
    const slots = new Set(accounts.map(account => `${account.keyringId}:${account.hdIndex}`));

    if (ids.size === 0 || ids.size !== keyrings.length || accounts.some(account => !ids.has(account.keyringId)) || slots.size !== accounts.length) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'The backup does not describe a valid wallet');
    }

    if (accounts.some(account => !isHdIndex(account.hdIndex))) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'The backup contains an invalid account index');
    }

    if (keyrings.some(keyring => (keyring.type === KeyringType.HD_WALLET ? !isValidMnemonic(keyring.mnemonic) : !isValidPrivateKeyHex(keyring.privateKey)))) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'The backup contains an invalid key');
    }
  }

  // The epoch is taken at call time: a lock issued after this call, even while it waits in the queue, wins.
  unlock(password: string): Promise<void> {
    const epoch = this.keyringSession.epoch;

    return this.accountService.runExclusive(async () => {
      this.assertNoPendingReset();
      await this.openSession(await this.vaultService.open(password), epoch);
    });
  }

  lock(): void {
    this.createdWith = null;
    this.keyringSession.close();
    this.vaultService.forgetSessionKey();
  }

  // Biometric unlock reads the password from a biometry-bound keychain item.
  unlockWithBiometrics(prompt: SecurePrompt): Promise<void> {
    const epoch = this.keyringSession.epoch;

    return this.accountService.runExclusive(async () => {
      this.assertNoPendingReset();
      const password = await this.readEscrowedPassword(prompt);

      await this.openSession(await this.vaultService.openWithEscrowedPassword(password), epoch);
    });
  }

  // A lock or reset that happened while the vault was being read wins over this unlock.
  private async openSession(content: VaultContent, epoch: number): Promise<void> {
    this.assertCurrentOrForget(epoch);
    this.keyringSession.open(content.keyrings);

    try {
      await this.restoreMissingAccounts(content.keyrings);
    }
    catch (error) {
      // A failed unlock must not leave decrypted keyrings or the vault key in memory behind a locked UI.
      this.keyringSession.close();
      this.vaultService.forgetSessionKey();
      throw error;
    }
  }

  private assertNoPendingReset(): void {
    if (this.resetMarker?.isPending()) {
      throw new AppError(AppErrorCode.RESET_INCOMPLETE, 'The last reset did not finish. Reset the wallet again.');
    }
  }

  // The vault key cached by an unlock that lost to a lock must not outlive it.
  private assertCurrentOrForget(epoch: number): void {
    if (this.keyringSession.epoch !== epoch) {
      this.vaultService.forgetSessionKey();
    }

    this.assertCurrent(epoch);
  }

  private assertCurrent(epoch: number): void {
    if (this.keyringSession.epoch !== epoch) {
      throw new AppError(AppErrorCode.WALLET_LOCKED, 'Wallet was locked while unlocking');
    }
  }

  getBiometryKind(): Promise<BiometryKind | null> {
    return this.biometricRepository.getBiometryKind();
  }

  async isBiometricUnlockEnabled(): Promise<boolean> {
    return this.preferenceRepository.get().biometricUnlockEnabled && (await this.biometricRepository.hasCredential());
  }

  async enableBiometricUnlock(password: string, prompt: SecurePrompt = ENABLE_BIOMETRICS_PROMPT): Promise<void> {
    const justCreated = this.consumeCreatedWith(password);

    if (!(await this.biometricRepository.getBiometryKind())) {
      throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric authentication is not available');
    }

    // Skips a second scrypt run right after creation; any lock, reset or vault write since then forces it.
    if (!justCreated) {
      await this.vaultService.verifyPassword(password);
    }

    await this.biometricRepository.saveCredential(password, prompt);
    this.preferenceRepository.update({ biometricUnlockEnabled: true });
  }

  // One-shot: true only for the creation password while that session and vault are unchanged.
  private consumeCreatedWith(password: string): boolean {
    const created = this.createdWith;

    this.createdWith = null;
    return created !== null
      && created.epoch === this.keyringSession.epoch
      && created.vaultRevision === this.vaultService.revision
      && created.digest === digestPassword(password);
  }

  async disableBiometricUnlock(): Promise<void> {
    await this.biometricRepository.clear();
    this.preferenceRepository.update({ biometricUnlockEnabled: false });
  }

  // The biometric credential (plaintext password) is removed before re-encrypting, so an interruption can
  // never leave the old password stored; callers re-enable biometrics with the new password afterwards.
  changePassword(currentPassword: string, nextPassword: string): Promise<void> {
    return this.runCurrent(() => this.vaultService.changePassword(currentPassword, nextPassword, () => this.biometricRepository.clear()));
  }

  // Counts against the shared attempt limit like every other typed password.
  verifyPassword(password: string): Promise<void> {
    return this.vaultService.verifyPassword(password);
  }

  async revealMnemonic(keyringId: string, password: string): Promise<string> {
    await this.vaultService.verifyPassword(password);
    return this.keyringSession.getMnemonic(keyringId);
  }

  // Releases the biometric-escrowed password for any password-gated action once it opens the vault.
  // Like biometric unlock it is not a typed guess: not throttled, and success clears earlier failures.
  async readBiometricPassword(prompt: SecurePrompt): Promise<string> {
    if (!(await this.isBiometricUnlockEnabled())) {
      throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric unlock is not set up');
    }

    const password = await this.readEscrowedPassword(prompt);

    await this.vaultService.openWithEscrowedPassword(password);
    return password;
  }

  // An invalidated credential turns biometric unlock off, so the prompt is not offered again.
  private async readEscrowedPassword(prompt: SecurePrompt): Promise<string> {
    let password: string | null;

    try {
      password = await this.biometricRepository.readCredential(prompt);
    }
    catch (error) {
      if (isAppError(error, AppErrorCode.BIOMETRICS_INVALIDATED)) {
        await this.disableBiometricUnlock().catch(() => undefined);
      }

      throw error;
    }

    if (password) {
      return password;
    }

    // Enabled but missing: iOS reports an invalidated item this way, as does a password change whose
    // re-enable did not finish. A cancel rejects instead, so it never lands here.
    if (this.preferenceRepository.get().biometricUnlockEnabled) {
      await this.disableBiometricUnlock().catch(() => undefined);
      throw new AppError(AppErrorCode.BIOMETRICS_INVALIDATED, BIOMETRICS_INVALIDATED_MESSAGE);
    }

    throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric unlock is not set up');
  }

  // Adding a key reveals nothing, so the unlocked session writes the vault with its cached key and
  // no password is asked. Secret-revealing or destructive actions still take the password.
  addMnemonicKeyring(mnemonic: string, accountName?: string): Promise<Account> {
    return this.runCurrent(() => this.addMnemonic(mnemonic, accountName));
  }

  importPrivateKey(privateKeyHex: string, accountName?: string): Promise<Account> {
    return this.runCurrent(() => this.addPrivateKey(privateKeyHex, accountName));
  }

  // Queued work issued before a lock or reset is dropped before it touches storage.
  private runCurrent<T>(task: () => Promise<T>): Promise<T> {
    const epoch = this.keyringSession.epoch;

    return this.accountService.runExclusive(() => {
      this.assertCurrent(epoch);
      return task();
    });
  }

  // Early check for a clear message; the vault re-checks against every stored keyring.
  private async addMnemonic(mnemonic: string, accountName?: string): Promise<Account> {
    if (!isValidMnemonic(mnemonic)) {
      throw new AppError(AppErrorCode.INVALID_MNEMONIC, 'Invalid recovery phrase');
    }

    const seed = await mnemonicToSeed(mnemonic);
    const keyPair = deriveKeyPair(seed, 0);

    seed.fill(0);
    const duplicate = this.accountService.isDuplicatePublicKey(toBase64(keyPair.publicKey));

    wipeKeyPair(keyPair);

    if (duplicate) {
      throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'This recovery phrase is already added');
    }

    return this.addKeyring(
      { id: createId(), type: KeyringType.HD_WALLET, mnemonic: normalizeMnemonic(mnemonic), createdAt: Date.now() },
      accountName,
    );
  }

  private async addPrivateKey(privateKeyHex: string, accountName?: string): Promise<Account> {
    const normalized = privateKeyHex.trim().replace(/^0x/, '').toLowerCase();

    if (!isValidPrivateKeyHex(normalized)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Invalid private key');
    }

    const keyPair = keyPairFromPrivateKey(fromHex(normalized));
    const duplicate = this.accountService.isDuplicatePublicKey(toBase64(keyPair.publicKey));

    wipeKeyPair(keyPair);

    if (duplicate) {
      throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'This account is already added');
    }

    return this.addKeyring(
      { id: createId(), type: KeyringType.PRIVATE_KEY, privateKey: normalized, createdAt: Date.now() },
      accountName,
    );
  }

  // The vault is updated first: if that fails, the account stays instead of coming back on the next unlock.
  removeAccount(accountId: string, password: string): Promise<void> {
    return this.runCurrent(async () => {
      const { removed, keyringEmpty } = this.accountService.planRemoval(accountId);

      if (keyringEmpty) {
        await this.vaultService.removeKeyring(removed.keyringId, password);
        this.keyringSession.remove(removed.keyringId);
      }
      else {
        await this.vaultService.verifyPassword(password);
      }

      this.accountService.removeAccount(accountId);
      this.accountScopedData.forEach(store => store.removeAccount(accountId));
    });
  }

  // Keychain items survive an iOS reinstall while general storage does not; rebuild index 0 per keyring.
  private async restoreMissingAccounts(keyrings: KeyringRecord[]): Promise<void> {
    const accounts = this.accountService.getAccounts();

    for (const keyring of keyrings) {
      if (!accounts.some(account => account.keyringId === keyring.id)) {
        // The same key can sit in two keyrings (a phrase and its exported private key); one account is enough.
        await this.accountService.appendAccount(keyring.id, keyring.type).catch((error: unknown) => {
          if (!isAppError(error, AppErrorCode.WALLET_ALREADY_EXISTS)) {
            throw error;
          }
        });
      }
    }
  }

  private async addKeyring(record: KeyringRecord, accountName?: string): Promise<Account> {
    if (!this.keyringSession.isUnlocked()) {
      throw new AppError(AppErrorCode.WALLET_LOCKED, 'Wallet is locked');
    }

    const content = await this.vaultService.addKeyringWithSessionKey(record);

    this.keyringSession.add(content.keyrings.find(keyring => keyring.id === record.id) ?? record);
    const account = await this.accountService.appendAccount(record.id, record.type, accountName);

    this.accountService.selectAccount(account.id);
    return account;
  }
}
