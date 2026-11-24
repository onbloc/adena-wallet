import { isAppError } from '../../../src/core/errors';
import { GENERAL_MIGRATIONS } from '../../../src/migration/general-migrations';
import { StorageKey } from '../../../src/migration/storage-keys';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { MigrationService } from '../../../src/services/migration.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { catchError } from '../../helpers/service-fakes';

const setup = () => {
  const keyValueStore = new MemoryKeyValueStore();
  const secureStore = new MemorySecureStore();

  return { keyValueStore, secureStore, service: new MigrationService(keyValueStore, secureStore) };
};

describe('MigrationService', () => {
  it('stamps both schemas on a fresh install', async () => {
    const { service, keyValueStore, secureStore } = setup();

    await expect(service.migrateAll()).resolves.toEqual({
      general: { fromVersion: 0, toVersion: 1, applied: [1] },
      secure: { fromVersion: 0, toVersion: 1, applied: [1] },
    });
    expect(keyValueStore.getString(StorageKey.SCHEMA_VERSION)).toBe('1');
    await expect(secureStore.getItem(SecureKey.SECURE_SCHEMA_VERSION)).resolves.toBe('1');
  });

  it('is a no-op when already current', async () => {
    const { service } = setup();

    await service.migrateAll();
    await expect(service.migrateAll()).resolves.toEqual({
      general: { fromVersion: 1, toVersion: 1, applied: [] },
      secure: { fromVersion: 1, toVersion: 1, applied: [] },
    });
  });

  it('refuses general data written by a newer app', async () => {
    const { service, keyValueStore } = setup();

    keyValueStore.setString(StorageKey.SCHEMA_VERSION, '7');
    expect(isAppError(await catchError(() => service.migrateAll()), 'MIGRATION_FAILED')).toBe(true);
    expect(keyValueStore.getString(StorageKey.SCHEMA_VERSION)).toBe('7');
  });

  it('refuses secure data written by a newer app before touching general storage', async () => {
    const { service, keyValueStore, secureStore } = setup();

    await secureStore.setItem(SecureKey.SECURE_SCHEMA_VERSION, '3');
    expect(isAppError(await catchError(() => service.migrateAll()), 'MIGRATION_FAILED')).toBe(true);
    expect(keyValueStore.getString(StorageKey.SCHEMA_VERSION)).toBeUndefined();
  });

  it('upgrades stores written by older versions step by step', async () => {
    const applied: number[] = [];

    GENERAL_MIGRATIONS.push({
      version: 2,
      description: 'test step',
      up: (store) => {
        applied.push(2);
        store.setString('migrated', 'yes');
      },
    });

    try {
      const { service, keyValueStore, secureStore } = setup();

      keyValueStore.setString(StorageKey.SCHEMA_VERSION, '1');
      await secureStore.setItem(SecureKey.SECURE_SCHEMA_VERSION, '1');
      expect((await service.migrateAll()).general).toEqual({ fromVersion: 1, toVersion: 2, applied: [2] });
      expect(applied).toEqual([2]);
      expect(keyValueStore.getString('migrated')).toBe('yes');
      expect(keyValueStore.getString(StorageKey.SCHEMA_VERSION)).toBe('2');
    }
    finally {
      GENERAL_MIGRATIONS.pop();
    }
  });
});
