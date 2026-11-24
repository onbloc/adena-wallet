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

  it('writes both copies so the replaced record survives in neither', async () => {
    const next = { ...record, contentVersion: 3 };

    await repository.write(record);
    await repository.write(next);

    for (const key of [SecureKey.VAULT, SecureKey.VAULT_STAGING]) {
      expect(JSON.parse((await secureStore.getItem(key))!).record).toEqual(next);
    }
  });

  it('keeps a complete copy when a write stops before the primary is replaced', async () => {
    const next = { ...record, contentVersion: 3 };

    await repository.write(record);
    const setItem = jest.spyOn(secureStore, 'setItem');

    setItem.mockImplementationOnce(async () => {
      throw new Error('killed while writing staging');
    });
    await expect(repository.write(next)).rejects.toThrow('killed');
    await secureStore.removeItem(SecureKey.VAULT_STAGING);
    await expect(repository.read()).resolves.toEqual(record);

    setItem.mockRestore();
    const original = secureStore.setItem.bind(secureStore);

    jest.spyOn(secureStore, 'setItem').mockImplementation(async (key, value) => {
      if (key === SecureKey.VAULT) {
        // Delete-then-add interrupted after the delete.
        await secureStore.removeItem(SecureKey.VAULT);
        throw new Error('killed while writing primary');
      }

      return original(key, value);
    });
    await expect(repository.write(next)).rejects.toThrow('killed');
    await expect(repository.read()).resolves.toEqual(next);
  });

  it('continues the sequence from the newest copy', async () => {
    await secureStore.setItem(SecureKey.VAULT_STAGING, JSON.stringify({ seq: 7, record: { ...record, contentVersion: 9 } }));
    await secureStore.setItem(SecureKey.VAULT, JSON.stringify({ seq: 6, record }));
    await expect(repository.read()).resolves.toEqual({ ...record, contentVersion: 9 });

    await repository.write(record);
    expect(JSON.parse((await secureStore.getItem(SecureKey.VAULT))!).seq).toBe(9);
  });

  it('clears both copies', async () => {
    await repository.write(record);
    await repository.clear();
    expect(await secureStore.hasItem(SecureKey.VAULT)).toBe(false);
    expect(await secureStore.hasItem(SecureKey.VAULT_STAGING)).toBe(false);
  });
});
