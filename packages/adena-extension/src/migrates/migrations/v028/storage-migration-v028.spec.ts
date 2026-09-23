import { StorageMigration028 } from './storage-migration-v028';

type V027Data = Parameters<StorageMigration028['up']>[0]['data'];

const BASE_DATA = {
  NETWORKS: [] as V027Data['NETWORKS'],
  CURRENT_CHAIN_ID: 'gnoland-1',
  CURRENT_NETWORK_ID: 'gnoland-1',
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
  SESSIONS: {},
} as V027Data;

describe('storage migration V028', () => {
  it('version', () => {
    expect(new StorageMigration028().version).toBe(28);
  });

  it('adds an empty GRC721 sync store', async () => {
    const result = await new StorageMigration028().up({ version: 27, data: BASE_DATA });

    expect(result.version).toBe(28);
    expect(result.data.ACCOUNT_GRC721_SYNC).toEqual({});
  });

  it('carries every other value through untouched', async () => {
    const result = await new StorageMigration028().up({ version: 27, data: BASE_DATA });

    const { ACCOUNT_GRC721_SYNC: _added, ...carried } = result.data;
    expect(carried).toEqual(BASE_DATA);
  });

  it('refuses data that is not V027', async () => {
    const { SERIALIZED: _missing, ...incomplete } = BASE_DATA;

    await expect(
      new StorageMigration028().up({ version: 27, data: incomplete as V027Data }),
    ).rejects.toThrow('Storage Data does not match version V027');
  });
});
