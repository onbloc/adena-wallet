import { StorageMigration020 } from './storage-migration-v020';

const BASE_DATA = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'test-13',
  CURRENT_NETWORK_ID: 'test-13',
  SERIALIZED: 'serialized-blob',
  ENCRYPTED_STORED_PASSWORD: 'encrypted-pw',
  CURRENT_ACCOUNT_ID: 'acc-1',
  ACCOUNT_NAMES: { 'acc-1': 'Main' },
  ESTABLISH_SITES: {},
  ADDRESS_BOOK: 'encrypted-address-book',
  ACCOUNT_TOKEN_METAINFOS: {},
  QUESTIONNAIRE_EXPIRED_DATE: null,
  WALLET_CREATION_GUIDE_CONFIRM_DATE: null,
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: null,
  ACCOUNT_GRC721_COLLECTIONS: {},
  ACCOUNT_GRC721_PINNED_PACKAGES: {},
  KDF_SALT: 'abc123',
};

function makeInput(overrides: Partial<typeof BASE_DATA> = {}) {
  return { version: 19 as const, data: { ...BASE_DATA, ...overrides } };
}

describe('StorageMigration020', () => {
  it('version is 20', () => {
    expect(new StorageMigration020().version).toBe(20);
  });

  it('returns a v020 model with SESSIONS initialized as empty object', async () => {
    const result = await new StorageMigration020().up(makeInput());
    expect(result.version).toBe(20);
    expect(result.data.SESSIONS).toEqual({});
  });

  it('preserves all v019 fields without loss', async () => {
    const result = await new StorageMigration020().up(makeInput());
    expect(result.data.NETWORKS).toEqual(BASE_DATA.NETWORKS);
    expect(result.data.CURRENT_CHAIN_ID).toBe(BASE_DATA.CURRENT_CHAIN_ID);
    expect(result.data.CURRENT_NETWORK_ID).toBe(BASE_DATA.CURRENT_NETWORK_ID);
    expect(result.data.SERIALIZED).toBe(BASE_DATA.SERIALIZED);
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe(BASE_DATA.ENCRYPTED_STORED_PASSWORD);
    expect(result.data.CURRENT_ACCOUNT_ID).toBe(BASE_DATA.CURRENT_ACCOUNT_ID);
    expect(result.data.ACCOUNT_NAMES).toEqual(BASE_DATA.ACCOUNT_NAMES);
    expect(result.data.ESTABLISH_SITES).toEqual(BASE_DATA.ESTABLISH_SITES);
    expect(result.data.ADDRESS_BOOK).toBe(BASE_DATA.ADDRESS_BOOK);
    expect(result.data.ACCOUNT_TOKEN_METAINFOS).toEqual(BASE_DATA.ACCOUNT_TOKEN_METAINFOS);
    expect(result.data.QUESTIONNAIRE_EXPIRED_DATE).toBe(BASE_DATA.QUESTIONNAIRE_EXPIRED_DATE);
    expect(result.data.WALLET_CREATION_GUIDE_CONFIRM_DATE).toBe(
      BASE_DATA.WALLET_CREATION_GUIDE_CONFIRM_DATE,
    );
    expect(result.data.ADD_ACCOUNT_GUIDE_CONFIRM_DATE).toBe(
      BASE_DATA.ADD_ACCOUNT_GUIDE_CONFIRM_DATE,
    );
    expect(result.data.ACCOUNT_GRC721_COLLECTIONS).toEqual(BASE_DATA.ACCOUNT_GRC721_COLLECTIONS);
    expect(result.data.ACCOUNT_GRC721_PINNED_PACKAGES).toEqual(
      BASE_DATA.ACCOUNT_GRC721_PINNED_PACKAGES,
    );
    expect(result.data.KDF_SALT).toBe(BASE_DATA.KDF_SALT);
  });

  it('throws when required v019 keys are missing', async () => {
    const { KDF_SALT, ...withoutKdfSalt } = BASE_DATA;
    const bad: any = { version: 19, data: withoutKdfSalt };
    await expect(new StorageMigration020().up(bad)).rejects.toThrow(
      'Storage Data does not match version V019',
    );
  });

  it('throws when SERIALIZED is not a string', async () => {
    const bad: any = { version: 19, data: { ...BASE_DATA, SERIALIZED: null } };
    await expect(new StorageMigration020().up(bad)).rejects.toThrow(
      'Storage Data does not match version V019',
    );
  });

  it('throws when NETWORKS is not an array', async () => {
    const bad: any = { version: 19, data: { ...BASE_DATA, NETWORKS: {} } };
    await expect(new StorageMigration020().up(bad)).rejects.toThrow(
      'Storage Data does not match version V019',
    );
  });
});
