import { GENERAL_MIGRATIONS } from '../../../src/migration/general-migrations';
import { latestVersion, runMigrations } from '../../../src/migration/migration-runner';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('GENERAL_MIGRATIONS', () => {
  it('forms a contiguous chain starting at 1', () => {
    expect(GENERAL_MIGRATIONS.map(step => step.version)).toEqual(Array.from({ length: GENERAL_MIGRATIONS.length }, (_, index) => index + 1));
    GENERAL_MIGRATIONS.forEach(step => expect(step.description).toBeTruthy());
  });

  it('migrates an empty store to the latest version without writing', async () => {
    const store = new MemoryKeyValueStore();
    const outcome = await runMigrations(store, 0, GENERAL_MIGRATIONS);

    expect(outcome.toVersion).toBe(latestVersion(GENERAL_MIGRATIONS));
    expect(store.getAllKeys()).toEqual([]);
  });
});
