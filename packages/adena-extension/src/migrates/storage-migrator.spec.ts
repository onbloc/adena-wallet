import { StorageModelV001 } from './migrations/v001/storage-model-v001';
import { StorageMigrator } from './storage-migrator';

const mockStorageV001: StorageModelV001 = {
  version: 1,
  data: {
    NETWORKS: [],
    CURRENT_CHAIN_ID: '',
    CURRENT_NETWORK_ID: '',
    SERIALIZED: 'U2FsdGVkX19eI8kOCI/T9o1Ru0b2wdj5rHxmG4QbLQ0yZH4kDa8/gg6Ac2JslvEm',
    ENCRYPTED_STORED_PASSWORD: '',
    CURRENT_ACCOUNT_ID: '',
    ACCOUNT_NAMES: {},
    ESTABLISH_SITES: {},
    ADDRESS_BOOK: {
      'account 1': [
        {
          id: 'address_1',
          address: 'address',
          createdAt: '0',
          name: 'addressbook 01',
        },
      ],
    },
    ACCOUNT_TOKEN_METAINFOS: {},
  },
};

const storage = {
  async set(): Promise<void> {
    return;
  },
  async get(): Promise<object> {
    return {};
  },
};

describe('StorageMigrator', () => {
  beforeAll(() => {
    const mockValue = {
      ADENA_DATA: JSON.stringify(mockStorageV001),
    };
    storage.get = jest.fn().mockResolvedValue(mockValue);
  });

  it('getCurrent success', async () => {
    const migrator = new StorageMigrator(StorageMigrator.migrations(), storage);
    const current = await migrator.getCurrent();

    expect(current).not.toBeNull();
    expect(current.version).toBe(1);
    expect(current.data).not.toBeNull();
    expect(current.data.NETWORKS).toHaveLength(0);
    expect(current.data.CURRENT_CHAIN_ID).toBe('');
    expect(current.data.CURRENT_NETWORK_ID).toBe('');
    expect(current.data.SERIALIZED).not.toBe('');
    expect(current.data.ENCRYPTED_STORED_PASSWORD).toBe('');
    expect(current.data.CURRENT_ACCOUNT_ID).toBe('');
    expect(current.data.ACCOUNT_NAMES).toEqual({});
    expect(current.data.ESTABLISH_SITES).toEqual({});
    expect(current.data.ADDRESS_BOOK).toHaveProperty('account 1');
  });

  it('migrate success', async () => {
    const migrator = new StorageMigrator(StorageMigrator.migrations(), storage);
    const current = await migrator.getCurrent();
    const migrated = await migrator.migrate(current, '123');

    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(9);
    expect(migrated?.data).not.toBeNull();
    expect(migrated?.data.NETWORKS).toHaveLength(3);
    expect(migrated?.data.CURRENT_CHAIN_ID).toBe('');
    expect(migrated?.data.CURRENT_NETWORK_ID).toBe('');
    expect(migrated?.data.ENCRYPTED_STORED_PASSWORD).toBe('');
    expect(migrated?.data.CURRENT_ACCOUNT_ID).toBe('');
    expect(migrated?.data.ACCOUNT_NAMES).toEqual({});
    expect(migrated?.data.ESTABLISH_SITES).toEqual({});
    expect(migrated?.data.ADDRESS_BOOK).toBe('');
  });

  it('migrate with password success', async () => {
    const migrator = new StorageMigrator(StorageMigrator.migrations(), storage);
    const current = await migrator.getCurrent();
    const migrated = await migrator.migrate(current, '123');

    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(9);
    expect(migrated?.data).not.toBeNull();
    expect(migrated?.data.SERIALIZED).not.toBe('');
    expect(migrated?.data.ADDRESS_BOOK).toBe('');
  });
});
