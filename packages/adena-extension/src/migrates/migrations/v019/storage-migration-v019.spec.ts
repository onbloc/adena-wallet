import { StorageMigration019 } from './storage-migration-v019';

const BASE_DATA = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'test13',
  CURRENT_NETWORK_ID: 'test13',
  SERIALIZED: '',
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
  KDF_SALT: 'abc123',
};

function makeInput(overrides: Partial<typeof BASE_DATA> = {}) {
  return { version: 18 as const, data: { ...BASE_DATA, ...overrides } };
}

describe('StorageMigration019', () => {
  it('version is 19', () => {
    expect(new StorageMigration019().version).toBe(19);
  });

  it('migrates CURRENT_CHAIN_ID from test13 to test-13', async () => {
    const result = await new StorageMigration019().up(makeInput());
    expect(result.version).toBe(19);
    expect(result.data.CURRENT_CHAIN_ID).toBe('test-13');
  });

  it('migrates CURRENT_NETWORK_ID from test13 to test-13', async () => {
    const result = await new StorageMigration019().up(makeInput());
    expect(result.data.CURRENT_NETWORK_ID).toBe('test-13');
  });

  it('does not change CURRENT_CHAIN_ID if it is not test13', async () => {
    const result = await new StorageMigration019().up(makeInput({ CURRENT_CHAIN_ID: 'gnoland1' }));
    expect(result.data.CURRENT_CHAIN_ID).toBe('gnoland1');
  });

  it('refreshes NETWORKS with test-13 from chains.json', async () => {
    const result = await new StorageMigration019().up(makeInput({ NETWORKS: [] }));
    const test13 = result.data.NETWORKS.find((n) => n.chainId === 'test-13');
    expect(test13).toBeDefined();
    expect(test13?.rpcUrl).toBe('https://rpc.test-13-aeddi-1.gnoland.network:443');
    expect(test13?.indexerUrl).toBe('https://indexer.test-13.gnoland.network:443');
  });

  it('migrates ESTABLISH_SITES chainId from test13 to test-13', async () => {
    const input = makeInput({
      ESTABLISH_SITES: {
        'acc-1': [
          {
            hostname: 'dapp.example',
            chainId: 'test13',
            account: 'g1abc',
            name: 'App',
            favicon: null,
            establishedTime: '0',
          },
        ],
      },
    });
    const result = await new StorageMigration019().up(input);
    expect(result.data.ESTABLISH_SITES['acc-1'][0].chainId).toBe('test-13');
  });

  it('leaves non-test13 ESTABLISH_SITES chainId unchanged', async () => {
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
    const result = await new StorageMigration019().up(input);
    expect(result.data.ESTABLISH_SITES['acc-1'][0].chainId).toBe('gnoland1');
  });

  it('migrates ACCOUNT_TOKEN_METAINFOS networkId from test13 to test-13', async () => {
    const input = makeInput({
      ACCOUNT_TOKEN_METAINFOS: {
        'acc-1': [
          {
            main: true,
            tokenId: 'test13:ugnot',
            networkId: 'test13',
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
    const result = await new StorageMigration019().up(input);
    expect(result.data.ACCOUNT_TOKEN_METAINFOS['acc-1'][0].networkId).toBe('test-13');
  });

  it('migrates ACCOUNT_GRC721_COLLECTIONS object key from test13 to test-13', async () => {
    const input = makeInput({
      ACCOUNT_GRC721_COLLECTIONS: {
        'acc-1': {
          test13: [
            {
              tokenId: '1',
              networkId: 'test13',
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
    const result = await new StorageMigration019().up(input);
    const accountCollections = result.data.ACCOUNT_GRC721_COLLECTIONS['acc-1'];
    expect(accountCollections['test13']).toBeUndefined();
    expect(accountCollections['test-13']).toHaveLength(1);
    expect(accountCollections['test-13'][0].networkId).toBe('test-13');
  });

  it('migrates ACCOUNT_GRC721_PINNED_PACKAGES object key from test13 to test-13', async () => {
    const input = makeInput({
      ACCOUNT_GRC721_PINNED_PACKAGES: {
        'acc-1': {
          test13: ['gno.land/r/test/nft'],
          gnoland1: ['gno.land/r/other/nft'],
        },
      },
    });
    const result = await new StorageMigration019().up(input);
    const pinned = result.data.ACCOUNT_GRC721_PINNED_PACKAGES['acc-1'];
    expect(pinned['test13']).toBeUndefined();
    expect(pinned['test-13']).toEqual(['gno.land/r/test/nft']);
    expect(pinned['gnoland1']).toEqual(['gno.land/r/other/nft']);
  });

  it('throws on invalid v018 data', async () => {
    const bad: any = { version: 18, data: { ...BASE_DATA, SERIALIZED: null } };
    await expect(new StorageMigration019().up(bad)).rejects.toThrow(
      'Storage Data does not match version V018',
    );
  });
});
