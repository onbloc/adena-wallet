import { decryptAES } from 'adena-module';
import { StorageMigration009 } from './storage-migration-v009';

const mockStorageData = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'test5',
  CURRENT_NETWORK_ID: 'test5',
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

describe('serialized wallet migration V009', () => {
  it('version', () => {
    const migration = new StorageMigration009();
    expect(migration.version).toBe(9);
  });

  it('up success', async () => {
    const mockData = {
      version: 8,
      data: mockStorageData,
    };
    const migration = new StorageMigration009();
    const result = await migration.up(mockData, '123');

    expect(result.version).toBe(9);
  });

  it('up password success', async () => {
    const mockData = {
      version: 1,
      data: mockStorageData,
    };
    const password = '123';
    const migration = new StorageMigration009();
    const result = await migration.up(mockData, password);

    expect(result.version).toBe(9);
    expect(result.data).not.toBeNull();

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
    const migration = new StorageMigration009();

    await expect(migration.up(mockData, '123')).rejects.toThrow(
      'Storage Data does not match version V009',
    );
  });
});
