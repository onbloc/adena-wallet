import { decryptAES } from 'adena-module';
import { StorageMigration006 } from './storage-migration-v006';

const mockStorageData = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'test3',
  CURRENT_NETWORK_ID: 'test3',
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
};

describe('serialized wallet migration V006', () => {
  it('version', () => {
    const migration = new StorageMigration006();
    expect(migration.version).toBe(6);
  });

  it('up success', async () => {
    const mockData = {
      version: 5,
      data: mockStorageData,
    };
    const migration = new StorageMigration006();
    const result = await migration.up(mockData);

    expect(result.version).toBe(6);
    expect(result.data).not.toBeNull();
    expect(result.data.NETWORKS.length).toEqual(3);
    expect(result.data.CURRENT_CHAIN_ID).toBe('test4');
    expect(result.data.CURRENT_NETWORK_ID).toBe('test4');
    expect(result.data.SERIALIZED).toBe(
      'U2FsdGVkX19eI8kOCI/T9o1Ru0b2wdj5rHxmG4QbLQ0yZH4kDa8/gg6Ac2JslvEm',
    );
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe('');
    expect(result.data.CURRENT_ACCOUNT_ID).toBe('');
    expect(result.data.ACCOUNT_NAMES).toEqual({});
    expect(result.data.ESTABLISH_SITES).toEqual({});
    expect(result.data.ADDRESS_BOOK).toEqual('');
    expect(result.data.QUESTIONNAIRE_EXPIRED_DATE).toEqual(null);
  });

  it('up password success', async () => {
    const mockData = {
      version: 1,
      data: mockStorageData,
    };
    const password = '123';
    const migration = new StorageMigration006();
    const result = await migration.up(mockData);

    expect(result.version).toBe(6);
    expect(result.data).not.toBeNull();
    expect(result.data.NETWORKS.length).toEqual(3);
    expect(result.data.CURRENT_CHAIN_ID).toBe('test4');
    expect(result.data.CURRENT_NETWORK_ID).toBe('test4');
    expect(result.data.SERIALIZED).not.toBe('');
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe('');
    expect(result.data.CURRENT_ACCOUNT_ID).toBe('');
    expect(result.data.ACCOUNT_NAMES).toEqual({});
    expect(result.data.ESTABLISH_SITES).toEqual({});
    expect(result.data.ADDRESS_BOOK).toEqual('');

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
    const migration = new StorageMigration006();

    await expect(migration.up(mockData)).rejects.toThrow(
      'Storage Data does not match version V005',
    );
  });
});
