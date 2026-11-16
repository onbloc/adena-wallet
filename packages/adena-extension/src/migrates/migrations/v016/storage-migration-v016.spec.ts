import { decryptAES } from 'adena-module';
import { StorageMigration016 } from './storage-migration-v016';

const mockStorageData = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'test10',
  CURRENT_NETWORK_ID: 'test10',
  SERIALIZED: 'U2FsdGVkX19eI8kOCI/T9o1Ru0b2wdj5rHxmG4QbLQ0yZH4kDa8/gg6Ac2JslvEm',
  ENCRYPTED_STORED_PASSWORD: '',
  CURRENT_ACCOUNT_ID: '',
  ACCOUNT_NAMES: {},
  ESTABLISH_SITES: {},
  ADDRESS_BOOK: '',
  ACCOUNT_TOKEN_METAINFOS: {},
  QUESTIONNAIRE_EXPIRED_DATE: null,
  WALLET_CREATION_GUIDE_CONFIRM_DATE: null,
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: null,
  ACCOUNT_GRC721_COLLECTIONS: {},
  ACCOUNT_GRC721_PINNED_PACKAGES: {},
};

describe('serialized wallet migration V015', () => {
  it('version', () => {
    const migration = new StorageMigration016();
    expect(migration.version).toBe(16);
  });

  it('up success', async () => {
    const mockData = {
      version: 15,
      data: mockStorageData,
    };
    const migration = new StorageMigration016();
    const result = await migration.up(mockData);

    expect(result.data.CURRENT_CHAIN_ID).toEqual('test11');
    expect(result.data.CURRENT_NETWORK_ID).toEqual('test11');
  });

  it('up password success', async () => {
    const mockData = {
      version: 1,
      data: mockStorageData,
    };
    const password = '123';
    const migration = new StorageMigration016();
    const result = await migration.up(mockData);

    expect(result.version).toBe(16);
    expect(result.data).not.toBeNull();
    expect(result.data.ACCOUNT_GRC721_COLLECTIONS).toEqual({});
    expect(result.data.ACCOUNT_GRC721_PINNED_PACKAGES).toEqual({});

    const serialized = result.data.SERIALIZED;
    const decrypted = await decryptAES(serialized, password);
    const wallet = JSON.parse(decrypted);

    expect(wallet.accounts).toHaveLength(0);
    expect(wallet.keyrings).toHaveLength(0);

    expect(result.data.CURRENT_CHAIN_ID).toEqual('test11');
    expect(result.data.CURRENT_NETWORK_ID).toEqual('test11');
  });

  it('up failed throw error', async () => {
    const mockData: any = {
      version: 1,
      data: { ...mockStorageData, SERIALIZED: null },
    };
    const migration = new StorageMigration016();

    await expect(migration.up(mockData)).rejects.toThrow(
      'Storage Data does not match version V015',
    );
  });
});
