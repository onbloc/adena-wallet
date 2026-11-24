import { GENERAL_MIGRATIONS } from '../migration/general-migrations';
import { MigrationOutcome, runMigrations } from '../migration/migration-runner';
import { SECURE_MIGRATIONS } from '../migration/secure-migrations';
import { StorageKey } from '../migration/storage-keys';
import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';
import { KeyValueStore } from '../storage/key-value-store';

// Runs storage schema migrations once at startup, before any repository is used.
export class MigrationService {
  constructor(
    private readonly keyValueStore: KeyValueStore,
    private readonly secureStore: SecureStore,
  ) {}

  async migrateAll(): Promise<{ general: MigrationOutcome; secure: MigrationOutcome }> {
    const secure = await runMigrations(
      this.secureStore,
      Number(await this.secureStore.getItem(SecureKey.SECURE_SCHEMA_VERSION) ?? 0),
      SECURE_MIGRATIONS,
      version => this.secureStore.setItem(SecureKey.SECURE_SCHEMA_VERSION, String(version)),
    );
    const general = await runMigrations(
      this.keyValueStore,
      Number(this.keyValueStore.getString(StorageKey.SCHEMA_VERSION) ?? 0),
      GENERAL_MIGRATIONS,
      version => this.keyValueStore.setString(StorageKey.SCHEMA_VERSION, String(version)),
    );

    return { general, secure };
  }
}
