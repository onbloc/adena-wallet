import { AppError, AppErrorCode } from '../core/errors';
import { hasCachedSeed, KeyringRecord, KeyringType, withCachedSeed } from '../crypto/keyring';
import { normalizeMnemonic } from '../crypto/mnemonic';
import { migrateData } from '../migration/migration-runner';
import { VAULT_CONTENT_VERSION, VAULT_MIGRATIONS, VaultContent } from '../migration/vault-migrations';
import { VaultRepository } from '../repositories/vault.repository';
import { findPasswordIssue, PASSWORD_ISSUE_MESSAGE } from '../security/password-policy';
import { VaultCipher, VaultKey, wipeVaultKey } from '../security/vault-cipher';
import { SerialQueue } from '../utils/serial-queue';
import { PasswordAttemptLimiter } from './password-attempt-limiter';

// Owns the encrypted vault: encryption, content migrations and password changes.
// Every read-modify-write runs on one queue, so overlapping updates cannot drop each other's keyrings.
export class VaultService {
  private readonly queue = new SerialQueue();
  private writes = 0;
  // Key of the stored vault from the last password check or write, so an unlocked session can
  // write without the password. Never persisted; WalletService wipes it on lock, reset wipes it too.
  private sessionKey: VaultKey | null = null;
  // Bumped whenever the session key is forgotten, so work that awaited across a lock can tell.
  private sessionGeneration = 0;

  constructor(
    private readonly vaultRepository: VaultRepository,
    private readonly cipher: VaultCipher,
    private readonly attemptLimiter: PasswordAttemptLimiter,
  ) {}

  // Changes on every vault write or wipe, so a caller can tell the stored vault is still the one it saw.
  get revision(): number {
    return this.writes;
  }

  exists(): Promise<boolean> {
    return this.vaultRepository.exists();
  }

  create(keyrings: KeyringRecord[], password: string): Promise<VaultContent> {
    return this.queue.run(async () => {
      const generation = this.sessionGeneration;

      if (await this.vaultRepository.exists()) {
        throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'A wallet already exists on this device');
      }

      return this.save({ keyrings }, password, generation);
    });
  }

  // Every typed password goes through the shared attempt limit.
  open(password: string): Promise<VaultContent> {
    return this.queue.run(() => this.openChecked(password));
  }

  // For a password released by biometrics: not throttled, and success clears earlier failures.
  openWithEscrowedPassword(password: string): Promise<VaultContent> {
    return this.queue.run(async () => {
      const content = await this.decrypt(password);

      await this.attemptLimiter.reset();
      return content;
    });
  }

  async verifyPassword(password: string): Promise<void> {
    await this.open(password);
  }

  addKeyring(keyring: KeyringRecord, password: string): Promise<VaultContent> {
    return this.queue.run(async () => {
      const generation = this.sessionGeneration;
      const content = await this.openChecked(password);

      // Checked against the vault itself, so it holds even after every account of a keyring was removed.
      if (content.keyrings.some(existing => isSameSecret(existing, keyring))) {
        throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'This wallet is already added');
      }

      return this.save({ ...content, keyrings: [...content.keyrings, keyring] }, password, generation);
    });
  }

  removeKeyring(keyringId: string, password: string): Promise<VaultContent> {
    return this.queue.run(async () => {
      const generation = this.sessionGeneration;
      const content = await this.openChecked(password);

      return this.save({ ...content, keyrings: content.keyrings.filter(keyring => keyring.id !== keyringId) }, password, generation);
    });
  }

  // `beforeSave` runs after the current password is verified and before re-encrypting; a rejection aborts the change.
  changePassword(currentPassword: string, nextPassword: string, beforeSave?: () => Promise<void>): Promise<void> {
    const issue = findPasswordIssue(nextPassword, { current: currentPassword });

    if (issue) {
      return Promise.reject(new AppError(AppErrorCode.WEAK_PASSWORD, PASSWORD_ISSUE_MESSAGE[issue]));
    }

    return this.queue.run(async () => {
      const generation = this.sessionGeneration;
      const content = await this.openChecked(currentPassword);

      await beforeSave?.();
      await this.save(content, nextPassword, generation);
    });
  }

  hasSessionKey(): boolean {
    return this.sessionKey !== null;
  }

  forgetSessionKey(): void {
    wipeVaultKey(this.sessionKey);
    this.sessionKey = null;
    this.sessionGeneration += 1;
  }

  // Adds a keyring with the session key instead of a password. Not a password guess, so not throttled.
  addKeyringWithSessionKey(keyring: KeyringRecord): Promise<VaultContent> {
    return this.queue.run(async () => {
      const key = this.sessionKey;
      const generation = this.sessionGeneration;
      const record = await this.vaultRepository.read();

      if (!key || !record) {
        throw new AppError(AppErrorCode.WALLET_LOCKED, 'Unlock the wallet again');
      }

      this.assertSession(key, generation);

      const migrated = migrateData<VaultContent>(JSON.parse(this.cipher.decryptWithKey(record.payload, key)), record.contentVersion, VAULT_MIGRATIONS);
      const content = migrated.data;

      if (content.keyrings.some(existing => isSameSecret(existing, keyring))) {
        throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'This wallet is already added');
      }

      const seeded = await withCachedSeeds({ ...content, keyrings: [...content.keyrings, keyring] });

      // A lock during the seed derivation wiped the key; encrypting with it would make the vault unreadable.
      this.assertSession(key, generation);
      const payload = this.cipher.encryptWithKey(JSON.stringify(seeded), key);

      this.writes += 1;
      await this.vaultRepository.write({ contentVersion: VAULT_CONTENT_VERSION, payload });
      return seeded;
    });
  }

  destroy(): Promise<void> {
    this.forgetSessionKey();

    return this.queue.run(async () => {
      this.forgetSessionKey();
      this.writes += 1;
      await this.vaultRepository.clear();
    });
  }

  private assertSession(key: VaultKey, generation: number): void {
    if (this.sessionKey !== key || this.sessionGeneration !== generation) {
      throw new AppError(AppErrorCode.WALLET_LOCKED, 'Wallet was locked before the change was saved');
    }
  }

  private openChecked(password: string): Promise<VaultContent> {
    return this.attemptLimiter.run(() => this.decrypt(password));
  }

  // Decrypts and migrates. Re-encrypting with current settings only changes the stored format,
  // so a failed re-save does not block the unlock; it is retried on the next one.
  private async decrypt(password: string): Promise<VaultContent> {
    const generation = this.sessionGeneration;
    const record = await this.vaultRepository.read();

    if (!record) {
      throw new AppError(AppErrorCode.WALLET_NOT_FOUND, 'No wallet on this device');
    }

    const { plaintext, key } = await this.cipher.decryptKeyed(record.payload, password);

    this.rememberKey(key, generation);
    const migrated = migrateData<VaultContent>(JSON.parse(plaintext), record.contentVersion, VAULT_MIGRATIONS);
    const missingSeed = !migrated.data.keyrings.every(hasCachedSeed);

    if (!migrated.changed && !missingSeed && !this.cipher.needsRehash(record.payload)) {
      return migrated.data;
    }

    const seeded = await withCachedSeeds(migrated.data);

    try {
      await this.write(seeded, password, generation);
    }
    catch {
      // Keep the readable copy as it is.
    }

    return seeded;
  }

  private async save(content: VaultContent, password: string, generation: number): Promise<VaultContent> {
    const seeded = await withCachedSeeds(content);

    await this.write(seeded, password, generation);
    return seeded;
  }

  // A write re-salts the vault, so the session key follows it once the write landed.
  private async write(content: VaultContent, password: string, generation: number): Promise<void> {
    const { payload, key } = await this.cipher.encryptKeyed(JSON.stringify(content), password);

    this.writes += 1;

    try {
      await this.vaultRepository.write({ contentVersion: VAULT_CONTENT_VERSION, payload });
    }
    catch (error) {
      wipeVaultKey(key);
      throw error;
    }

    this.rememberKey(key, generation);
  }

  // A key derived across a lock is dropped, so no session key outlives the session it was made for.
  private rememberKey(key: VaultKey, generation: number): void {
    if (this.sessionGeneration !== generation) {
      wipeVaultKey(key);
      return;
    }

    if (this.sessionKey !== key) {
      wipeVaultKey(this.sessionKey);
    }

    this.sessionKey = key;
  }
}

const isSameSecret = (a: KeyringRecord, b: KeyringRecord): boolean => {
  if (a.type === KeyringType.HD_WALLET && b.type === KeyringType.HD_WALLET) {
    return normalizeMnemonic(a.mnemonic) === normalizeMnemonic(b.mnemonic);
  }

  return a.type === KeyringType.PRIVATE_KEY && b.type === KeyringType.PRIVATE_KEY && a.privateKey.toLowerCase() === b.privateKey.toLowerCase();
};

const withCachedSeeds = async (content: VaultContent): Promise<VaultContent> => ({
  ...content,
  keyrings: await Promise.all(content.keyrings.map(withCachedSeed)),
});
