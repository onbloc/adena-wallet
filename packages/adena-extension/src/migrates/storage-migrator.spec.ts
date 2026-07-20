/**
 * @jest-environment node
 */
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
    expect(migrated?.version).toBe(22);
    expect(migrated?.data).not.toBeNull();
    expect(migrated?.data.NETWORKS).toHaveLength(4);
    expect(migrated?.data.CURRENT_CHAIN_ID).toBe('');
    expect(migrated?.data.CURRENT_NETWORK_ID).toBe('');
    expect(migrated?.data.CURRENT_ACCOUNT_ID).toBe('');
    expect(migrated?.data.ACCOUNT_NAMES).toEqual({});
    expect(migrated?.data.ESTABLISH_SITES).toEqual({});
    expect(migrated?.data.ADDRESS_BOOK).toBe('');
    expect(migrated?.data.SESSIONS).toEqual({});
  });

  it('migrate with password success', async () => {
    const migrator = new StorageMigrator(StorageMigrator.migrations(), storage);
    const current = await migrator.getCurrent();
    const migrated = await migrator.migrate(current, '123');

    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(22);
    expect(migrated?.data).not.toBeNull();
    expect(migrated?.data.SERIALIZED).not.toBe('');
    expect(migrated?.data.ADDRESS_BOOK).toBe('');
    expect(migrated?.data.SESSIONS).toEqual({});
  });
});

describe('StorageMigrator version reconciliation', () => {
  // Regression: a prior fallback bug persisted already-migrated data
  // (XChaCha20 SERIALIZED + populated KDF_SALT) under a stale low version label
  // such as 12. Re-running migrations made v018 AES-decrypt XChaCha20
  // ciphertext, throwing "cannot decrypt SERIALIZED" and locking the wallet.
  const xchachaSerialized = JSON.stringify({ ciphertext: 'abc', nonce: 'xyz' });
  const staleData = {
    version: 12,
    data: {
      NETWORKS: [],
      CURRENT_CHAIN_ID: '',
      CURRENT_NETWORK_ID: 'test-13',
      SERIALIZED: xchachaSerialized,
      ENCRYPTED_STORED_PASSWORD: '',
      CURRENT_ACCOUNT_ID: 'd9bef3bd',
      ACCOUNT_NAMES: { d9bef3bd: 'Account 1' },
      ESTABLISH_SITES: {},
      ADDRESS_BOOK: '',
      ACCOUNT_TOKEN_METAINFOS: {},
      QUESTIONNAIRE_EXPIRED_DATE: '1784117519',
      WALLET_CREATION_GUIDE_CONFIRM_DATE: '1781525514',
      ADD_ACCOUNT_GUIDE_CONFIRM_DATE: null,
      ACCOUNT_GRC721_COLLECTIONS: {},
      ACCOUNT_GRC721_PINNED_PACKAGES: {},
      KDF_SALT: 'MRWNtRD3p0//pPAUCzQmcA==',
    },
  };

  const staleStorage = {
    async set(): Promise<void> {
      return;
    },
    async get(keys?: unknown): Promise<object> {
      if (keys === 'ADENA_DATA') {
        return { ADENA_DATA: JSON.stringify(staleData) };
      }
      return {};
    },
  };

  it('getCurrent bumps a stale version label to 19 when KDF_SALT is present', async () => {
    const migrator = new StorageMigrator(StorageMigrator.migrations(), staleStorage);
    const current = await migrator.getCurrent();

    expect(current.version).toBe(19);
  });

  it('migrate no longer re-decrypts XChaCha20 SERIALIZED and reaches v22', async () => {
    const migrator = new StorageMigrator(StorageMigrator.migrations(), staleStorage);
    const current = await migrator.getCurrent();
    const migrated = await migrator.migrate(current, '123');

    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(22);
    // SERIALIZED must be left untouched (no AES re-decrypt attempt).
    expect(migrated?.data.SERIALIZED).toBe(xchachaSerialized);
  });
});
