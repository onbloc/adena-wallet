import { latestVersion, runMigrations } from '../../../src/migration/migration-runner';
import { SECURE_MIGRATIONS } from '../../../src/migration/secure-migrations';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';

describe('SECURE_MIGRATIONS', () => {
  it('forms a contiguous chain starting at 1', () => {
    expect(SECURE_MIGRATIONS.map(step => step.version)).toEqual(Array.from({ length: SECURE_MIGRATIONS.length }, (_, index) => index + 1));
  });

  it('migrates a fresh keychain without touching items', async () => {
    const store = new MemorySecureStore();

    await store.setItem(SecureKey.VAULT, 'v');

    const outcome = await runMigrations(store, 0, SECURE_MIGRATIONS);

    expect(outcome.toVersion).toBe(latestVersion(SECURE_MIGRATIONS));
    expect(await store.getItem(SecureKey.VAULT)).toBe('v');
  });
});
