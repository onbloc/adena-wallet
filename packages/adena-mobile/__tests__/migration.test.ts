import { isAppError } from '../src/core/errors';
import { migrateData, MigrationStep, runMigrations } from '../src/migration/migration-runner';
import { StorageKey } from '../src/migration/storage-keys';
import { MemorySecureStore } from '../src/security/memory-secure-store';
import { SecureKey } from '../src/security/secure-keys';
import { MigrationService } from '../src/services/migration.service';
import { MemoryKeyValueStore } from '../src/storage/memory-key-value-store';

describe('runMigrations', () => {
  const steps: MigrationStep<string[]>[] = [
    { version: 2, description: 'second', up: log => void log.push('v2') },
    { version: 1, description: 'first', up: log => void log.push('v1') },
    { version: 3, description: 'third', up: log => void log.push('v3') },
  ];

  it('applies pending steps in version order and reports progress', async () => {
    const log: string[] = [];
    const saved: number[] = [];
    const outcome = await runMigrations(log, 1, steps, version => void saved.push(version));

    expect(log).toEqual(['v2', 'v3']);
    expect(saved).toEqual([2, 3]);
    expect(outcome).toEqual({ fromVersion: 1, toVersion: 3, applied: [2, 3] });
  });

  it('refuses data written by a newer app version', async () => {
    await runMigrations([], 9, steps).catch(error => expect(isAppError(error, 'MIGRATION_FAILED')).toBe(true));
    expect.assertions(1);
  });

  it('refuses a gap in the step list', async () => {
    await runMigrations([], 0, [steps[0]]).catch(error => expect(isAppError(error, 'MIGRATION_FAILED')).toBe(true));
    expect.assertions(1);
  });
});

describe('migrateData', () => {
  it('transforms versioned records step by step', () => {
    const result = migrateData<{ items: string[] }>({ list: ['a'] }, 1, [
      { version: 1, up: data => data },
      { version: 2, up: data => ({ items: (data as { list: string[] }).list }) },
    ]);

    expect(result).toEqual({ data: { items: ['a'] }, version: 2, changed: true });
  });
});

describe('MigrationService', () => {
  it('stamps schema versions on fresh installs', async () => {
    const keyValueStore = new MemoryKeyValueStore();
    const secureStore = new MemorySecureStore();

    await new MigrationService(keyValueStore, secureStore).migrateAll();
    expect(keyValueStore.getString(StorageKey.SCHEMA_VERSION)).toBe('1');
    await expect(secureStore.getItem(SecureKey.SECURE_SCHEMA_VERSION)).resolves.toBe('1');
  });
});
