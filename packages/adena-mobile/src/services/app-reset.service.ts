import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';
import { KeyValueStore } from '../storage/key-value-store';
import { KeyringSession } from './keyring-session';
import { MigrationService } from './migration.service';

// Factory reset: wipes every secret and every general record, then re-stamps fresh schemas.
export class AppResetService {
  constructor(
    private readonly keyringSession: KeyringSession,
    private readonly secureStore: SecureStore,
    private readonly keyValueStore: KeyValueStore,
    private readonly migrationService: MigrationService,
  ) {}

  async resetAll(): Promise<void> {
    this.keyringSession.close();
    // The MMKV encryption key stays so the already-open store keeps working; its contents are wiped.
    const secrets = Object.values(SecureKey).filter(key => key !== SecureKey.STORAGE_ENCRYPTION_KEY);

    await Promise.all(secrets.map(key => this.secureStore.removeItem(key)));
    this.keyValueStore.clearAll();
    await this.migrationService.migrateAll();
  }
}
