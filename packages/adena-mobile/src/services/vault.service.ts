import { AppError, AppErrorCode } from '../core/errors';
import { hasCachedSeed, KeyringRecord, KeyringType, withCachedSeed } from '../crypto/keyring';
import { normalizeMnemonic } from '../crypto/mnemonic';
import { migrateData } from '../migration/migration-runner';
import { VAULT_CONTENT_VERSION, VAULT_MIGRATIONS, VaultContent } from '../migration/vault-migrations';
import { VaultRepository } from '../repositories/vault.repository';
import { findPasswordIssue, PASSWORD_ISSUE_MESSAGE } from '../security/password-policy';
import { VaultCipher } from '../security/vault-cipher';
import { SerialQueue } from '../utils/serial-queue';
import { PasswordAttemptLimiter } from './password-attempt-limiter';

// Owns the encrypted vault: encryption, content migrations and password changes.
// Every read-modify-write runs on one queue, so overlapping updates cannot drop each other's keyrings.
export class VaultService {
  private readonly queue = new SerialQueue();

  constructor(
    private readonly vaultRepository: VaultRepository,
    private readonly cipher: VaultCipher,
    private readonly attemptLimiter: PasswordAttemptLimiter,
  ) {}

  exists(): Promise<boolean> {
    return this.vaultRepository.exists();
  }

  create(keyrings: KeyringRecord[], password: string): Promise<VaultContent> {
    return this.queue.run(async () => {
      if (await this.vaultRepository.exists()) {
        throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'A wallet already exists on this device');
      }

      return this.save({ keyrings }, password);
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
      const content = await this.openChecked(password);

      // Checked against the vault itself, so it holds even after every account of a keyring was removed.
      if (content.keyrings.some(existing => isSameSecret(existing, keyring))) {
        throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'This wallet is already added');
      }

      return this.save({ ...content, keyrings: [...content.keyrings, keyring] }, password);
    });
  }

  removeKeyring(keyringId: string, password: string): Promise<VaultContent> {
    return this.queue.run(async () => {
      const content = await this.openChecked(password);

      return this.save({ ...content, keyrings: content.keyrings.filter(keyring => keyring.id !== keyringId) }, password);
    });
  }

  changePassword(currentPassword: string, nextPassword: string): Promise<void> {
    const issue = findPasswordIssue(nextPassword, { current: currentPassword });

    if (issue) {
      return Promise.reject(new AppError(AppErrorCode.WEAK_PASSWORD, PASSWORD_ISSUE_MESSAGE[issue]));
    }

    return this.queue.run(async () => {
      await this.save(await this.openChecked(currentPassword), nextPassword);
    });
  }

  destroy(): Promise<void> {
    return this.queue.run(() => this.vaultRepository.clear());
  }

  private openChecked(password: string): Promise<VaultContent> {
    return this.attemptLimiter.run(() => this.decrypt(password));
  }

  // Decrypts and migrates. Re-encrypting with current settings only changes the stored format,
  // so a failed re-save does not block the unlock; it is retried on the next one.
  private async decrypt(password: string): Promise<VaultContent> {
    const record = await this.vaultRepository.read();

    if (!record) {
      throw new AppError(AppErrorCode.WALLET_NOT_FOUND, 'No wallet on this device');
    }

    const plaintext = await this.cipher.decrypt(record.payload, password);
    const migrated = migrateData<VaultContent>(JSON.parse(plaintext), record.contentVersion, VAULT_MIGRATIONS);
    const missingSeed = !migrated.data.keyrings.every(hasCachedSeed);

    if (!migrated.changed && !missingSeed && !this.cipher.needsRehash(record.payload)) {
      return migrated.data;
    }

    const seeded = await withCachedSeeds(migrated.data);

    try {
      await this.write(seeded, password);
    }
    catch {
      // Keep the readable copy as it is.
    }

    return seeded;
  }

  private async save(content: VaultContent, password: string): Promise<VaultContent> {
    const seeded = await withCachedSeeds(content);

    await this.write(seeded, password);
    return seeded;
  }

  private async write(content: VaultContent, password: string): Promise<void> {
    const payload = await this.cipher.encrypt(JSON.stringify(content), password);

    await this.vaultRepository.write({ contentVersion: VAULT_CONTENT_VERSION, payload });
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
