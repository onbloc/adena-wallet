import { StorageMigration022 } from './storage-migration-v022';

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
  SESSIONS: {},
};

function makeInput(overrides: Partial<typeof BASE_DATA> = {}) {
  return { version: 21 as const, data: { ...BASE_DATA, ...overrides } };
}

describe('StorageMigration022', () => {
  it('version is 22', () => {
    expect(new StorageMigration022().version).toBe(22);
  });

  it('migrates CURRENT_CHAIN_ID from test-13 to topaz-1', async () => {
    const result = await new StorageMigration022().up(makeInput());
    expect(result.version).toBe(22);
    expect(result.data.CURRENT_CHAIN_ID).toBe('topaz-1');
  });

  it('migrates CURRENT_NETWORK_ID from test-13 to topaz-1', async () => {
    const result = await new StorageMigration022().up(makeInput());
    expect(result.data.CURRENT_NETWORK_ID).toBe('topaz-1');
  });

  it('does not change CURRENT_CHAIN_ID if it is not test-13', async () => {
    const result = await new StorageMigration022().up(makeInput({ CURRENT_CHAIN_ID: 'gnoland1' }));
    expect(result.data.CURRENT_CHAIN_ID).toBe('gnoland1');
  });

  it('refreshes NETWORKS with topaz-1 from chains.json', async () => {
    const result = await new StorageMigration022().up(makeInput({ NETWORKS: [] }));
    const topaz = result.data.NETWORKS.find((n) => n.chainId === 'topaz-1');
    expect(topaz).toBeDefined();
    expect(topaz?.rpcUrl).toBe('https://topaz.rpc.onbloc.xyz:443');
    expect(topaz?.indexerUrl).toBe('https://indexer.topaz.gnoland.network:443');
    expect(result.data.NETWORKS.find((n) => n.chainId === 'test-13')).toBeUndefined();
  });

  it('removes ESTABLISH_SITES entries for test-13', async () => {
    const input = makeInput({
      ESTABLISH_SITES: {
        'acc-1': [
          {
            hostname: 'dapp.example',
            chainId: 'test-13',
            account: 'g1abc',
            name: 'App',
            favicon: null,
            establishedTime: '0',
          },
        ],
      },
    });
    const result = await new StorageMigration022().up(input);
    expect(result.data.ESTABLISH_SITES).toEqual({});
  });

  it('leaves non-test-13 ESTABLISH_SITES unchanged', async () => {
    const input = makeInput({
      ESTABLISH_SITES: {
        'acc-1': [
          {
            hostname: 'dapp.example',
            chainId: 'gnoland1',
            account: 'g1abc',
            name: 'App',
            favicon: null,
            establishedTime: '0',
          },
        ],
      },
    });
    const result = await new StorageMigration022().up(input);
    expect(result.data.ESTABLISH_SITES['acc-1'][0].chainId).toBe('gnoland1');
  });

  it('removes ACCOUNT_TOKEN_METAINFOS entries for test-13', async () => {
    const input = makeInput({
      ACCOUNT_TOKEN_METAINFOS: {
        'acc-1': [
          {
            main: true,
            tokenId: 'test-13:ugnot',
            networkId: 'test-13',
            display: true,
            type: 'gno-native' as const,
            name: 'Gno',
            symbol: 'GNOT',
            decimals: 6,
            image: '',
          },
        ],
      },
    });
    const result = await new StorageMigration022().up(input);
    expect(result.data.ACCOUNT_TOKEN_METAINFOS).toEqual({});
  });

  it('removes SESSIONS entries for test-13', async () => {
    const input = makeInput({
      SESSIONS: {
        g1abc: {
          masterAddress: 'g1master',
          chainId: 'test-13',
          allowPaths: [],
          spendLimit: '0',
          spendPeriod: 0,
          expiresAt: 0,
          status: 'ACTIVE' as const,
          createdAt: 0,
        },
      },
    });
    const result = await new StorageMigration022().up(input);
    expect(result.data.SESSIONS).toEqual({});
  });

  it('removes ACCOUNT_GRC721_COLLECTIONS entries for test-13', async () => {
    const input = makeInput({
      ACCOUNT_GRC721_COLLECTIONS: {
        'acc-1': {
          'test-13': [
            {
              tokenId: '1',
              networkId: 'test-13',
              display: true,
              type: 'grc721' as const,
              packagePath: 'gno.land/r/test',
              name: 'NFT',
              symbol: 'NFT',
              image: null,
              isTokenUri: false,
              isMetadata: false,
            },
          ],
        },
      },
    });
    const result = await new StorageMigration022().up(input);
    expect(result.data.ACCOUNT_GRC721_COLLECTIONS).toEqual({});
  });

  it('removes ACCOUNT_GRC721_PINNED_PACKAGES entries for test-13', async () => {
    const input = makeInput({
      ACCOUNT_GRC721_PINNED_PACKAGES: {
        'acc-1': {
          'test-13': ['gno.land/r/test/nft'],
          gnoland1: ['gno.land/r/other/nft'],
        },
      },
    });
    const result = await new StorageMigration022().up(input);
    const pinned = result.data.ACCOUNT_GRC721_PINNED_PACKAGES['acc-1'];
    expect(pinned['test-13']).toBeUndefined();
    expect(pinned.gnoland1).toEqual(['gno.land/r/other/nft']);
  });

  it('preserves unrelated v021 fields without loss', async () => {
    const result = await new StorageMigration022().up(makeInput());
    expect(result.data.SERIALIZED).toBe(BASE_DATA.SERIALIZED);
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe(BASE_DATA.ENCRYPTED_STORED_PASSWORD);
    expect(result.data.CURRENT_ACCOUNT_ID).toBe(BASE_DATA.CURRENT_ACCOUNT_ID);
    expect(result.data.ACCOUNT_NAMES).toEqual(BASE_DATA.ACCOUNT_NAMES);
    expect(result.data.ADDRESS_BOOK).toBe(BASE_DATA.ADDRESS_BOOK);
    expect(result.data.KDF_SALT).toBe(BASE_DATA.KDF_SALT);
  });

  it('throws when required v021 keys are missing', async () => {
    const { KDF_SALT, ...withoutKdfSalt } = BASE_DATA;
    const bad: any = { version: 21, data: withoutKdfSalt };
    await expect(new StorageMigration022().up(bad)).rejects.toThrow(
      'Storage Data does not match version V021',
    );
  });

  it('throws when SERIALIZED is not a string', async () => {
    const bad: any = { version: 21, data: { ...BASE_DATA, SERIALIZED: null } };
    await expect(new StorageMigration022().up(bad)).rejects.toThrow(
      'Storage Data does not match version V021',
    );
  });

  it('throws when NETWORKS is not an array', async () => {
    const bad: any = { version: 21, data: { ...BASE_DATA, NETWORKS: {} } };
    await expect(new StorageMigration022().up(bad)).rejects.toThrow(
      'Storage Data does not match version V021',
    );
  });
});
