import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';
import { KeyValueStore } from '../storage/key-value-store';
import { KeyringSession } from './keyring-session';
import { MigrationService } from './migration.service';
import { ResetMarker } from './reset-marker';
import { VaultService } from './vault.service';

// Factory reset: wipes every secret and every general record, then re-stamps fresh schemas.
export class AppResetService {
  constructor(
    private readonly keyringSession: KeyringSession,
    private readonly vaultService: VaultService,
    private readonly secureStore: SecureStore,
    private readonly keyValueStore: KeyValueStore,
    private readonly migrationService: MigrationService,
    private readonly resetMarker: ResetMarker = new ResetMarker(keyValueStore),
  ) {}

  async resetAll(): Promise<void> {
    this.keyringSession.close();
    this.resetMarker.markPending();
    // Queued behind in-flight vault work, so an unlock-time re-save cannot write the vault back afterwards.
    await this.vaultService.destroy();
    // The MMKV encryption key stays so the already-open store keeps working; its contents are wiped.
    // The backup restore throttle stays too, so a reset cannot be used to skip its back-off.
    const kept: SecureKey[] = [SecureKey.STORAGE_ENCRYPTION_KEY, SecureKey.BACKUP_PASSWORD_ATTEMPTS];
    const secrets = Object.values(SecureKey).filter(key => !kept.includes(key));

    await Promise.all(secrets.map(key => this.secureStore.removeItem(key)));
    // Clears the reset marker too, so it goes only after every secret is gone.
    this.keyValueStore.clearAll();
    await this.migrationService.migrateAll();
  }
}
