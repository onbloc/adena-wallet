import { AppError, AppErrorCode } from '../core/errors';
import { hasCachedSeed, KeyringRecord, withCachedSeed } from '../crypto/keyring';
import { migrateData } from '../migration/migration-runner';
import { VAULT_CONTENT_VERSION, VAULT_MIGRATIONS, VaultContent } from '../migration/vault-migrations';
import { VaultRepository } from '../repositories/vault.repository';
import { findPasswordIssue, PASSWORD_ISSUE_MESSAGE } from '../security/password-policy';
import { VaultCipher } from '../security/vault-cipher';
import { PasswordAttemptLimiter } from './password-attempt-limiter';

// Owns the encrypted vault: encryption, content migrations and password changes.
export class VaultService {
  constructor(
    private readonly vaultRepository: VaultRepository,
    private readonly cipher: VaultCipher,
    private readonly attemptLimiter: PasswordAttemptLimiter,
  ) {}

  exists(): Promise<boolean> {
    return this.vaultRepository.exists();
  }

  async create(keyrings: KeyringRecord[], password: string): Promise<VaultContent> {
    if (await this.vaultRepository.exists()) {
      throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'A wallet already exists on this device');
    }

    return this.save({ keyrings }, password);
  }

  // Every typed password goes through the shared attempt limit.
  open(password: string): Promise<VaultContent> {
    return this.attemptLimiter.run(() => this.decrypt(password));
  }

  // For a password released by biometrics: not throttled, and success clears earlier failures.
  async openWithEscrowedPassword(password: string): Promise<VaultContent> {
    const content = await this.decrypt(password);

    await this.attemptLimiter.reset();
    return content;
  }

  // Decrypts, migrates and (if needed) re-encrypts with current KDF settings.
  private async decrypt(password: string): Promise<VaultContent> {
    const record = await this.vaultRepository.read();

    if (!record) {
      throw new AppError(AppErrorCode.WALLET_NOT_FOUND, 'No wallet on this device');
    }

    const plaintext = await this.cipher.decrypt(record.payload, password);
    const migrated = migrateData<VaultContent>(JSON.parse(plaintext), record.contentVersion, VAULT_MIGRATIONS);
    const missingSeed = !migrated.data.keyrings.every(hasCachedSeed);

    if (migrated.changed || missingSeed || this.cipher.needsRehash(record.payload)) {
      return this.save(migrated.data, password);
    }

    return migrated.data;
  }

  async verifyPassword(password: string): Promise<void> {
    await this.open(password);
  }

  async addKeyring(keyring: KeyringRecord, password: string): Promise<VaultContent> {
    const content = await this.open(password);

    return this.save({ ...content, keyrings: [...content.keyrings, keyring] }, password);
  }

  async removeKeyring(keyringId: string, password: string): Promise<VaultContent> {
    const content = await this.open(password);

    return this.save({ ...content, keyrings: content.keyrings.filter(keyring => keyring.id !== keyringId) }, password);
  }

  async changePassword(currentPassword: string, nextPassword: string): Promise<void> {
    const issue = findPasswordIssue(nextPassword, { current: currentPassword });

    if (issue) {
      throw new AppError(AppErrorCode.WEAK_PASSWORD, PASSWORD_ISSUE_MESSAGE[issue]);
    }

    await this.save(await this.open(currentPassword), nextPassword);
  }

  destroy(): Promise<void> {
    return this.vaultRepository.clear();
  }

  private async save(content: VaultContent, password: string): Promise<VaultContent> {
    const seeded = { ...content, keyrings: await Promise.all(content.keyrings.map(withCachedSeed)) };
    const payload = await this.cipher.encrypt(JSON.stringify(seeded), password);

    await this.vaultRepository.write({ contentVersion: VAULT_CONTENT_VERSION, payload });
    return seeded;
  }
}
