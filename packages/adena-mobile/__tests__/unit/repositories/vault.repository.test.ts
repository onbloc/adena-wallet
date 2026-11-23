import { SecureVaultRepository, VaultRecord } from '../../../src/repositories/vault.repository';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';

const record: VaultRecord = {
  contentVersion: 2,
  payload: {
    kdf: { name: 'scrypt', N: 1024, r: 8, p: 1, dkLen: 32, salt: 'c2FsdA==' },
    cipher: { name: 'xchacha20poly1305', nonce: 'bm9uY2U=' },
    ciphertext: 'Y3Q=',
  },
};

describe('SecureVaultRepository', () => {
  let secureStore: MemorySecureStore;
  let repository: SecureVaultRepository;

  beforeEach(() => {
    secureStore = new MemorySecureStore();
    repository = new SecureVaultRepository(secureStore);
  });

  it('reports absence and reads null when empty', async () => {
    await expect(repository.exists()).resolves.toBe(false);
    await expect(repository.read()).resolves.toBeNull();
  });

  it('round-trips a record and clears it', async () => {
    await repository.write(record);
    await expect(repository.exists()).resolves.toBe(true);
    await expect(repository.read()).resolves.toEqual(record);
    await repository.clear();
    await expect(repository.exists()).resolves.toBe(false);
  });

  it('treats an empty stored string as no vault', async () => {
    await secureStore.setItem(SecureKey.VAULT, '');
    await expect(repository.read()).resolves.toBeNull();
  });

  it('surfaces corrupt vault data instead of hiding it', async () => {
    await secureStore.setItem(SecureKey.VAULT, '{corrupt');
    await expect(repository.read()).rejects.toThrow(SyntaxError);
  });
});
