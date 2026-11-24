import { fromBase64 } from '@cosmjs/encoding';

import { AppError, AppErrorCode } from '../core/errors';
import { HD_INDEX_LIMIT, isHdIndex } from '../crypto/key-pair';
import { isValidPrivateKeyHex, KeyringType } from '../crypto/keyring';
import { isValidMnemonic, normalizeMnemonic } from '../crypto/mnemonic';
import { EncryptedPayload, KdfSettings, VaultCipher } from './vault-cipher';

export const BACKUP_FORMAT = 'adena-wallet-backup';
// v2 adds the write revision, account order, avatar colors and the selected account. v1 files still decode.
export const BACKUP_VERSION = 2;
const LEGACY_VERSION = 1;

// The file sits in the user's cloud where it can be attacked offline, so it uses a costlier scrypt than the vault.
export const BACKUP_KDF_SETTINGS: KdfSettings = { N: 2 ** 17, r: 8, p: 1 };

// Bounds for parameters read from a file: a tampered file can neither weaken nor stall the derivation.
export interface BackupKdfLimits {
  minN: number;
  maxN: number;
}

// 2^18 with r = 8 needs 256 MiB, the most a phone can be asked for without risking an out-of-memory kill.
export const BACKUP_KDF_LIMITS: BackupKdfLimits = { minN: 2 ** 15, maxN: 2 ** 18 };

// Checked before any vault is written, so a tampered file cannot fail halfway through a restore.
export const BACKUP_LIMITS = {
  maxHdIndexExclusive: HD_INDEX_LIMIT,
  maxKeyrings: 100,
  maxAccounts: 1000,
  maxNameLength: 256,
} as const;

export interface BackupAccount {
  name: string;
  hdIndex: number;
  // Unknown colors are kept in the file but ignored on restore.
  avatarColor?: string;
  // Display position across all keyrings (v2).
  position?: number;
}

export type BackupKeyring
  = | { id: string; type: typeof KeyringType.HD_WALLET; mnemonic: string; createdAt: number; accounts: BackupAccount[] }
    | { id: string; type: typeof KeyringType.PRIVATE_KEY; privateKey: string; createdAt: number; accounts: BackupAccount[] };

// Decrypted backup. Secret: keep it in memory only for as long as the restore flow needs it.
export interface BackupContent {
  version: number;
  backupId: string;
  createdAt: number;
  // Incremented on every write of this backupId; 0 for v1 files.
  revision: number;
  selected?: { keyringId: string; hdIndex: number };
  keyrings: BackupKeyring[];
}

// What the cloud file holds. Only the id, date and revision are readable without the backup password.
export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: number;
  backupId: string;
  createdAt: number;
  // Absent in v1 files (read as 0).
  revision?: number;
  encryption: EncryptedPayload;
}

export interface BackupHeader {
  version: number;
  backupId: string;
  createdAt: number;
  revision: number;
}

const BACKUP_ID_PATTERN = /^[0-9a-f]{32}$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 24;
const TAG_LENGTH = 16;

const corrupted = (detail: string): AppError => new AppError(AppErrorCode.BACKUP_CORRUPTED, `This backup file is damaged (${detail}).`);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const isPowerOfTwo = (value: number): boolean => Number.isInteger(value) && value > 1 && (value & (value - 1)) === 0;

const isTimestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

const isRevision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1;

// Decoded byte length of a canonical base64 string, or -1.
const base64Length = (value: unknown): number => {
  if (typeof value !== 'string' || !BASE64_PATTERN.test(value)) {
    return -1;
  }

  try {
    return fromBase64(value).length;
  }
  catch {
    return -1;
  }
};

const assertVersion = (version: unknown): void => {
  if (typeof version === 'number' && Number.isInteger(version) && version > BACKUP_VERSION) {
    throw new AppError(AppErrorCode.BACKUP_UNSUPPORTED_VERSION, 'This backup was made by a newer version of Adena. Update the app to restore it.');
  }

  if (version !== BACKUP_VERSION && version !== LEGACY_VERSION) {
    throw corrupted('version');
  }
};

export const headerOf = (envelope: BackupEnvelope): BackupHeader => ({
  version: envelope.version,
  backupId: envelope.backupId,
  createdAt: envelope.createdAt,
  revision: envelope.revision ?? 0,
});

// Encrypts and validates backup files with the vault cipher (scrypt + XChaCha20-Poly1305).
export class BackupCodec {
  constructor(
    private readonly cipher: VaultCipher,
    private readonly limits: BackupKdfLimits = BACKUP_KDF_LIMITS,
  ) {}

  async encode(content: BackupContent, password: string): Promise<string> {
    if (content.version !== BACKUP_VERSION || !isRevision(content.revision)) {
      throw corrupted('version');
    }

    assertContent(content, { version: content.version, backupId: content.backupId, createdAt: content.createdAt, revision: content.revision });
    const envelope: BackupEnvelope = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      backupId: content.backupId,
      createdAt: content.createdAt,
      revision: content.revision,
      encryption: await this.cipher.encrypt(JSON.stringify(content), password),
    };

    return JSON.stringify(envelope);
  }

  // Checks everything readable without the password, so a damaged file fails before the slow KDF
  // and is never counted as a wrong password.
  parseEnvelope(raw: string): BackupEnvelope {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    }
    catch {
      throw corrupted('not JSON');
    }

    if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
      throw corrupted('format');
    }

    assertVersion(parsed.version);

    if (typeof parsed.backupId !== 'string' || !BACKUP_ID_PATTERN.test(parsed.backupId) || !isTimestamp(parsed.createdAt)) {
      throw corrupted('header');
    }

    if (parsed.version === BACKUP_VERSION ? !isRevision(parsed.revision) : parsed.revision !== undefined) {
      throw corrupted('header');
    }

    this.assertEncryption(parsed.encryption);
    return parsed as unknown as BackupEnvelope;
  }

  // A wrong password and a modified ciphertext both fail authentication (INVALID_PASSWORD).
  async decode(raw: string, password: string): Promise<BackupContent> {
    const envelope = this.parseEnvelope(raw);
    const header = headerOf(envelope);
    const plaintext = await this.cipher.decrypt(envelope.encryption, password);
    let content: unknown;

    try {
      content = JSON.parse(plaintext);
    }
    catch {
      throw corrupted('payload');
    }

    if (isRecord(content) && content.version === LEGACY_VERSION && header.version === LEGACY_VERSION) {
      assertContent({ ...content, revision: 0 }, header);
      return { ...(content as unknown as BackupContent), revision: 0 };
    }

    assertContent(content, header);
    return content;
  }

  private assertEncryption(value: unknown): void {
    if (!isRecord(value) || !isRecord(value.kdf) || !isRecord(value.cipher)) {
      throw corrupted('encryption');
    }

    const { name, N, r, p, dkLen, salt } = value.kdf;
    const settingsValid = name === 'scrypt'
      && typeof N === 'number' && isPowerOfTwo(N) && N >= this.limits.minN && N <= this.limits.maxN
      && r === 8 && p === 1 && dkLen === KEY_LENGTH && base64Length(salt) === SALT_LENGTH;

    if (!settingsValid || value.cipher.name !== 'xchacha20poly1305' || base64Length(value.cipher.nonce) !== NONCE_LENGTH) {
      throw corrupted('encryption');
    }

    // The payload is JSON, so there is at least one byte besides the authentication tag.
    if (base64Length(value.ciphertext) <= TAG_LENGTH) {
      throw corrupted('ciphertext');
    }
  }
}

// The header is not authenticated by the cipher; matching it against the encrypted copy detects edits.
function assertContent(content: unknown, header: BackupHeader): asserts content is BackupContent {
  if (!isRecord(content)) {
    throw corrupted('payload');
  }

  assertVersion(content.version);

  if (content.version !== header.version || content.backupId !== header.backupId || content.createdAt !== header.createdAt || content.revision !== header.revision) {
    throw corrupted('header mismatch');
  }

  if (!Array.isArray(content.keyrings) || content.keyrings.length === 0 || content.keyrings.length > BACKUP_LIMITS.maxKeyrings) {
    throw corrupted('keyrings');
  }

  const ids = new Set<string>();
  const secrets = new Set<string>();
  const positions = new Set<number>();
  const accountKeys = new Set<string>();
  let accountCount = 0;

  for (const keyring of content.keyrings as unknown[]) {
    const { id, secret, accounts } = assertKeyring(keyring);

    if (ids.has(id) || secrets.has(secret)) {
      throw corrupted('duplicate keyring');
    }

    ids.add(id);
    secrets.add(secret);
    accountCount += accounts.length;

    if (accountCount > BACKUP_LIMITS.maxAccounts) {
      throw corrupted('too many accounts');
    }

    for (const account of accounts) {
      accountKeys.add(`${id}:${account.hdIndex}`);

      if (account.position !== undefined) {
        positions.add(account.position);
      }
    }
  }

  // Positions are all present or all absent, and form 0..n-1.
  const allPositioned = positions.size === accountCount && [...positions].every(position => position < accountCount);

  if (positions.size > 0 && !allPositioned) {
    throw corrupted('account order');
  }

  if (content.selected !== undefined) {
    const selected = content.selected;

    if (!isRecord(selected) || typeof selected.keyringId !== 'string' || !Number.isInteger(selected.hdIndex) || !accountKeys.has(`${selected.keyringId}:${String(selected.hdIndex)}`)) {
      throw corrupted('selected account');
    }
  }
}

// Returns the id, a normalized form of the secret (for the duplicate check) and the checked accounts.
function assertKeyring(keyring: unknown): { id: string; secret: string; accounts: BackupAccount[] } {
  if (!isRecord(keyring) || typeof keyring.id !== 'string' || !keyring.id || keyring.id.length > 64 || !isTimestamp(keyring.createdAt)) {
    throw corrupted('keyring');
  }

  const accounts = keyring.accounts;

  if (!Array.isArray(accounts) || accounts.length === 0 || accounts.length > BACKUP_LIMITS.maxAccounts) {
    throw corrupted('accounts');
  }

  const indices = new Set<number>();

  for (const account of accounts as unknown[]) {
    if (!isRecord(account) || !isBackupAccount(account) || indices.has(account.hdIndex)) {
      throw corrupted('accounts');
    }

    indices.add(account.hdIndex);
  }

  const checked = accounts as BackupAccount[];

  if (keyring.type === KeyringType.HD_WALLET && typeof keyring.mnemonic === 'string' && isValidMnemonic(keyring.mnemonic)) {
    return { id: keyring.id, secret: `m:${normalizeMnemonic(keyring.mnemonic)}`, accounts: checked };
  }

  if (keyring.type === KeyringType.PRIVATE_KEY && typeof keyring.privateKey === 'string' && isValidPrivateKeyHex(keyring.privateKey)) {
    if (accounts.length !== 1 || !indices.has(0)) {
      throw corrupted('accounts');
    }

    return { id: keyring.id, secret: `k:${keyring.privateKey.toLowerCase().replace(/^0x/, '')}`, accounts: checked };
  }

  throw corrupted('keyring secret');
}

const isBackupAccount = (account: Record<string, unknown>): account is Record<string, unknown> & BackupAccount =>
  typeof account.name === 'string'
  && account.name.length <= BACKUP_LIMITS.maxNameLength
  && isHdIndex(account.hdIndex)
  && (account.avatarColor === undefined || (typeof account.avatarColor === 'string' && account.avatarColor.length <= 32))
  && (account.position === undefined || (Number.isInteger(account.position) && (account.position as number) >= 0));
