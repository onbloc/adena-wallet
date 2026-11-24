import { KeyringType } from '../../../src/crypto/keyring';
import { migrateData } from '../../../src/migration/migration-runner';
import { VAULT_CONTENT_VERSION, VAULT_MIGRATIONS, VaultContent } from '../../../src/migration/vault-migrations';

describe('VAULT_MIGRATIONS', () => {
  it('ends at the current vault content version', () => {
    expect(Math.max(...VAULT_MIGRATIONS.map(step => step.version))).toBe(VAULT_CONTENT_VERSION);
  });

  it('keeps v1 content as is', () => {
    const content: VaultContent = { keyrings: [{ id: 'k', type: KeyringType.PRIVATE_KEY, privateKey: '01', createdAt: 1 }] };
    const result = migrateData<VaultContent>(content, 0, VAULT_MIGRATIONS);

    expect(result).toEqual({ data: content, version: 1, changed: true });
    expect(migrateData(content, VAULT_CONTENT_VERSION, VAULT_MIGRATIONS).changed).toBe(false);
  });
});
