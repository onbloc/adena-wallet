import { StorageMigration024 } from './storage-migration-v024';

const BASE_DATA = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'topaz-1',
  CURRENT_NETWORK_ID: 'topaz-1',
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
  return { version: 23 as const, data: { ...BASE_DATA, ...overrides } };
}

describe('StorageMigration024', () => {
  it('version is 24', () => {
    expect(new StorageMigration024().version).toBe(24);
  });

  it('migrates CURRENT_CHAIN_ID from topaz-1 to sapphire-1', async () => {
    const result = await new StorageMigration024().up(makeInput());
    expect(result.version).toBe(24);
    expect(result.data.CURRENT_CHAIN_ID).toBe('sapphire-1');
  });

  it('migrates CURRENT_NETWORK_ID from topaz-1 to sapphire-1', async () => {
    const result = await new StorageMigration024().up(makeInput());
    expect(result.data.CURRENT_NETWORK_ID).toBe('sapphire-1');
  });

  it('does not change CURRENT_CHAIN_ID if it is not topaz-1', async () => {
    const result = await new StorageMigration024().up(makeInput({ CURRENT_CHAIN_ID: 'gnoland1' }));
    expect(result.data.CURRENT_CHAIN_ID).toBe('gnoland1');
  });

  it('refreshes NETWORKS with sapphire-1 from chains.json and drops topaz-1', async () => {
    const result = await new StorageMigration024().up(makeInput({ NETWORKS: [] }));
    const sapphire = result.data.NETWORKS.find((n) => n.chainId === 'sapphire-1');
    expect(sapphire).toBeDefined();
    expect(sapphire?.rpcUrl).toBe('https://rpc.sapphire.testnets.gno.land:443');
    expect(result.data.NETWORKS.find((n) => n.chainId === 'topaz-1')).toBeUndefined();
  });

  it('removes ESTABLISH_SITES entries for topaz-1', async () => {
    const input = makeInput({
      ESTABLISH_SITES: {
        'acc-1': [
          {
            hostname: 'dapp.example',
            chainId: 'topaz-1',
            account: 'g1abc',
            name: 'App',
            favicon: null,
            establishedTime: '0',
          },
        ],
      },
    });
    const result = await new StorageMigration024().up(input);
    expect(result.data.ESTABLISH_SITES).toEqual({});
  });

  it('leaves non-topaz-1 ESTABLISH_SITES unchanged', async () => {
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
    const result = await new StorageMigration024().up(input);
    expect(result.data.ESTABLISH_SITES['acc-1'][0].chainId).toBe('gnoland1');
  });

  it('removes ACCOUNT_TOKEN_METAINFOS entries for topaz-1', async () => {
    const input = makeInput({
      ACCOUNT_TOKEN_METAINFOS: {
        'acc-1': [
          {
            main: true,
            tokenId: 'topaz-1:ugnot',
            networkId: 'topaz-1',
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
    const result = await new StorageMigration024().up(input);
    expect(result.data.ACCOUNT_TOKEN_METAINFOS).toEqual({});
  });

  it('removes SESSIONS entries for topaz-1', async () => {
    const input = makeInput({
      SESSIONS: {
        g1abc: {
          masterAddress: 'g1master',
          chainId: 'topaz-1',
          allowPaths: [],
          spendLimit: '0',
          spendPeriod: 0,
          expiresAt: 0,
          status: 'ACTIVE' as const,
          createdAt: 0,
        },
      },
    });
    const result = await new StorageMigration024().up(input);
    expect(result.data.SESSIONS).toEqual({});
  });

  it('removes ACCOUNT_GRC721_COLLECTIONS entries for topaz-1', async () => {
    const input = makeInput({
      ACCOUNT_GRC721_COLLECTIONS: {
        'acc-1': {
          'topaz-1': [
            {
              tokenId: '1',
              networkId: 'topaz-1',
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
    const result = await new StorageMigration024().up(input);
    expect(result.data.ACCOUNT_GRC721_COLLECTIONS).toEqual({});
  });

  it('removes ACCOUNT_GRC721_PINNED_PACKAGES entries for topaz-1', async () => {
    const input = makeInput({
      ACCOUNT_GRC721_PINNED_PACKAGES: {
        'acc-1': {
          'topaz-1': ['gno.land/r/test/nft'],
          gnoland1: ['gno.land/r/other/nft'],
        },
      },
    });
    const result = await new StorageMigration024().up(input);
    const pinned = result.data.ACCOUNT_GRC721_PINNED_PACKAGES['acc-1'];
    expect(pinned['topaz-1']).toBeUndefined();
    expect(pinned.gnoland1).toEqual(['gno.land/r/other/nft']);
  });

  it('preserves unrelated v023 fields without loss', async () => {
    const result = await new StorageMigration024().up(makeInput());
    expect(result.data.SERIALIZED).toBe(BASE_DATA.SERIALIZED);
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe(BASE_DATA.ENCRYPTED_STORED_PASSWORD);
    expect(result.data.CURRENT_ACCOUNT_ID).toBe(BASE_DATA.CURRENT_ACCOUNT_ID);
    expect(result.data.ACCOUNT_NAMES).toEqual(BASE_DATA.ACCOUNT_NAMES);
    expect(result.data.ADDRESS_BOOK).toBe(BASE_DATA.ADDRESS_BOOK);
    expect(result.data.KDF_SALT).toBe(BASE_DATA.KDF_SALT);
  });

  it('throws when required v023 keys are missing', async () => {
    const { KDF_SALT, ...withoutKdfSalt } = BASE_DATA;
    const bad: any = { version: 23, data: withoutKdfSalt };
    await expect(new StorageMigration024().up(bad)).rejects.toThrow(
      'Storage Data does not match version V023',
    );
  });

  it('throws when SERIALIZED is not a string', async () => {
    const bad: any = { version: 23, data: { ...BASE_DATA, SERIALIZED: null } };
    await expect(new StorageMigration024().up(bad)).rejects.toThrow(
      'Storage Data does not match version V023',
    );
  });
});
