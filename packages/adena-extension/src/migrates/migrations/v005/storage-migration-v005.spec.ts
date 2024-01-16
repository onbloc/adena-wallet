import { decryptAES } from 'adena-module';
import { StorageMigration005 } from './storage-migration-v005';

const mockStorageData = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: '',
  CURRENT_NETWORK_ID: '',
  SERIALIZED: 'U2FsdGVkX19eI8kOCI/T9o1Ru0b2wdj5rHxmG4QbLQ0yZH4kDa8/gg6Ac2JslvEm',
  ENCRYPTED_STORED_PASSWORD: '',
  CURRENT_ACCOUNT_ID: '',
  ACCOUNT_NAMES: {},
  ESTABLISH_SITES: {},
  ADDRESS_BOOK: [],
  ACCOUNT_TOKEN_METAINFOS: {},
};

describe('serialized wallet migration V004', () => {
  it('version', () => {
    const migration = new StorageMigration005();
    expect(migration.version).toBe(5);
  });

  it('up success', async () => {
    const mockData = {
      version: 2,
      data: mockStorageData,
    };
    const migration = new StorageMigration005();
    const result = await migration.up(mockData);

    expect(result.version).toBe(5);
    expect(result.data).not.toBeNull();
    expect(result.data.NETWORKS).toEqual([]);
    expect(result.data.CURRENT_CHAIN_ID).toBe('');
    expect(result.data.CURRENT_NETWORK_ID).toBe('');
    expect(result.data.SERIALIZED).toBe(
      'U2FsdGVkX19eI8kOCI/T9o1Ru0b2wdj5rHxmG4QbLQ0yZH4kDa8/gg6Ac2JslvEm',
    );
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe('');
    expect(result.data.CURRENT_ACCOUNT_ID).toBe('');
    expect(result.data.ACCOUNT_NAMES).toEqual({});
    expect(result.data.ESTABLISH_SITES).toEqual({});
    expect(result.data.ADDRESS_BOOK).toEqual([]);
  });

  it('up password success', async () => {
    const mockData = {
      version: 1,
      data: mockStorageData,
    };
    const password = '123';
    const migration = new StorageMigration005();
    const result = await migration.up(mockData);

    expect(result.version).toBe(5);
    expect(result.data).not.toBeNull();
    expect(result.data.NETWORKS).toEqual([]);
    expect(result.data.CURRENT_CHAIN_ID).toBe('');
    expect(result.data.CURRENT_NETWORK_ID).toBe('');
    expect(result.data.SERIALIZED).not.toBe('');
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe('');
    expect(result.data.CURRENT_ACCOUNT_ID).toBe('');
    expect(result.data.ACCOUNT_NAMES).toEqual({});
    expect(result.data.ESTABLISH_SITES).toEqual({});
    expect(result.data.ADDRESS_BOOK).toEqual([]);

    const serialized = result.data.SERIALIZED;
    const decrypted = await decryptAES(serialized, password);
    const wallet = JSON.parse(decrypted);

    expect(wallet.accounts).toHaveLength(0);
    expect(wallet.keyrings).toHaveLength(0);
  });

  it('up failed throw error', async () => {
    const mockData: any = {
      version: 1,
      data: { ...mockStorageData, SERIALIZED: null },
    };
    const migration = new StorageMigration005();

    await expect(migration.up(mockData)).rejects.toThrow(
      'Storage Data does not match version V004',
    );
  });
});
