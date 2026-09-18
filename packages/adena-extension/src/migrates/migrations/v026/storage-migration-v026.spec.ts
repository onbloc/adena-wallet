import { StorageMigration026 } from './storage-migration-v026';

const BASE_DATA = {
  NETWORKS: [] as Parameters<StorageMigration026['up']>[0]['data']['NETWORKS'],
  CURRENT_CHAIN_ID: 'gnoland1',
  CURRENT_NETWORK_ID: 'gnoland1',
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
  return { version: 25 as const, data: { ...BASE_DATA, ...overrides } };
}

function site(chainId: string) {
  return {
    hostname: 'dapp.example',
    chainId,
    account: 'g1abc',
    name: 'App',
    favicon: null,
    establishedTime: '0',
  };
}

function token(networkId: string) {
  return {
    main: true,
    tokenId: `${networkId}:ugnot`,
    networkId,
    display: true,
    type: 'gno-native' as const,
    name: 'Gno',
    symbol: 'GNOT',
    decimals: 6,
    image: '',
  };
}

function session(chainId: string) {
  return {
    masterAddress: 'g1master',
    chainId,
    allowPaths: [],
    spendLimit: '0',
    spendPeriod: 0,
    expiresAt: 0,
    status: 'ACTIVE' as const,
    createdAt: 0,
  };
}

describe('StorageMigration026', () => {
  it('version is 26', () => {
    expect(new StorageMigration026().version).toBe(26);
  });

  it('moves a gnoland1 beta mainnet user onto the gnoland-1 mainnet', async () => {
    const result = await new StorageMigration026().up(makeInput());
    expect(result.version).toBe(26);
    expect(result.data.CURRENT_CHAIN_ID).toBe('gnoland-1');
    expect(result.data.CURRENT_NETWORK_ID).toBe('gnoland-1');
  });

  it('moves a pearl-1 testnet user onto the staging testnet', async () => {
    const result = await new StorageMigration026().up(
      makeInput({ CURRENT_CHAIN_ID: 'pearl-1', CURRENT_NETWORK_ID: 'pearl-1' }),
    );
    expect(result.data.CURRENT_CHAIN_ID).toBe('staging');
    expect(result.data.CURRENT_NETWORK_ID).toBe('staging');
  });

  it('does not change CURRENT_CHAIN_ID when it is not a retired chain', async () => {
    const result = await new StorageMigration026().up(
      makeInput({ CURRENT_CHAIN_ID: 'dev', CURRENT_NETWORK_ID: 'dev' }),
    );
    expect(result.data.CURRENT_CHAIN_ID).toBe('dev');
    expect(result.data.CURRENT_NETWORK_ID).toBe('dev');
  });

  it('refreshes NETWORKS from chains.json and drops gnoland1 and pearl-1', async () => {
    const result = await new StorageMigration026().up(makeInput({ NETWORKS: [] }));
    const mainnet = result.data.NETWORKS.find((n) => n.chainId === 'gnoland-1');
    expect(mainnet).toBeDefined();
    expect(mainnet?.main).toBe(true);
    expect(mainnet?.rpcUrl).toBe('https://rpc.gno.land:443');
    expect(result.data.NETWORKS.find((n) => n.chainId === 'gnoland1')).toBeUndefined();
    expect(result.data.NETWORKS.find((n) => n.chainId === 'pearl-1')).toBeUndefined();
  });

  it('keeps custom networks that are not retired chains', async () => {
    const custom = {
      id: 'custom',
      default: false,
      main: false,
      chainId: 'custom-1',
      chainName: 'Custom',
      networkId: 'custom-1',
      networkName: 'Custom',
      addressPrefix: 'g',
      rpcUrl: 'https://custom.example',
      indexerUrl: '',
      gnoUrl: '',
      apiUrl: '',
      linkUrl: '',
    };
    const result = await new StorageMigration026().up(makeInput({ NETWORKS: [custom] }));
    expect(result.data.NETWORKS.find((n) => n.chainId === 'custom-1')).toBeDefined();
  });

  it('removes ESTABLISH_SITES entries for retired chains and keeps the rest', async () => {
    const input = makeInput({
      ESTABLISH_SITES: {
        'acc-1': [site('gnoland1'), site('pearl-1')],
        'acc-2': [site('staging')],
      },
    });
    const result = await new StorageMigration026().up(input);
    expect(result.data.ESTABLISH_SITES).toEqual({ 'acc-2': [site('staging')] });
  });

  it('removes ACCOUNT_TOKEN_METAINFOS entries for retired chains', async () => {
    const input = makeInput({
      ACCOUNT_TOKEN_METAINFOS: {
        'acc-1': [token('gnoland1'), token('pearl-1'), token('dev')],
      },
    });
    const result = await new StorageMigration026().up(input);
    expect(result.data.ACCOUNT_TOKEN_METAINFOS).toEqual({ 'acc-1': [token('dev')] });
  });

  it('removes SESSIONS entries for retired chains', async () => {
    const input = makeInput({
      SESSIONS: {
        g1beta: session('gnoland1'),
        g1pearl: session('pearl-1'),
        g1staging: session('staging'),
      },
    });
    const result = await new StorageMigration026().up(input);
    expect(result.data.SESSIONS).toEqual({ g1staging: session('staging') });
  });

  it('removes ACCOUNT_GRC721_COLLECTIONS entries for retired chains', async () => {
    const collection = (networkId: string) => [
      {
        tokenId: '1',
        networkId,
        display: true,
        type: 'grc721' as const,
        packagePath: 'gno.land/r/test',
        name: 'NFT',
        symbol: 'NFT',
        image: null,
        isTokenUri: false,
        isMetadata: false,
      },
    ];
    const input = makeInput({
      ACCOUNT_GRC721_COLLECTIONS: {
        'acc-1': { gnoland1: collection('gnoland1'), 'pearl-1': collection('pearl-1') },
        'acc-2': { staging: collection('staging') },
      },
    });
    const result = await new StorageMigration026().up(input);
    expect(result.data.ACCOUNT_GRC721_COLLECTIONS).toEqual({
      'acc-2': { staging: collection('staging') },
    });
  });

  it('removes ACCOUNT_GRC721_PINNED_PACKAGES entries for retired chains', async () => {
    const input = makeInput({
      ACCOUNT_GRC721_PINNED_PACKAGES: {
        'acc-1': {
          gnoland1: ['gno.land/r/test/nft'],
          'pearl-1': ['gno.land/r/test/nft'],
          staging: ['gno.land/r/other/nft'],
        },
      },
    });
    const result = await new StorageMigration026().up(input);
    expect(result.data.ACCOUNT_GRC721_PINNED_PACKAGES).toEqual({
      'acc-1': { staging: ['gno.land/r/other/nft'] },
    });
  });

  it('preserves unrelated v025 fields without loss', async () => {
    const result = await new StorageMigration026().up(makeInput());
    expect(result.data.SERIALIZED).toBe(BASE_DATA.SERIALIZED);
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe(BASE_DATA.ENCRYPTED_STORED_PASSWORD);
    expect(result.data.CURRENT_ACCOUNT_ID).toBe(BASE_DATA.CURRENT_ACCOUNT_ID);
    expect(result.data.ACCOUNT_NAMES).toEqual(BASE_DATA.ACCOUNT_NAMES);
    expect(result.data.ADDRESS_BOOK).toBe(BASE_DATA.ADDRESS_BOOK);
    expect(result.data.KDF_SALT).toBe(BASE_DATA.KDF_SALT);
  });

  it('throws when required v025 keys are missing', async () => {
    const { KDF_SALT, ...withoutKdfSalt } = BASE_DATA;
    const bad: any = { version: 25, data: withoutKdfSalt };
    await expect(new StorageMigration026().up(bad)).rejects.toThrow(
      'Storage Data does not match version V025',
    );
  });

  it('throws when SERIALIZED is not a string', async () => {
    const bad: any = { version: 25, data: { ...BASE_DATA, SERIALIZED: null } };
    await expect(new StorageMigration026().up(bad)).rejects.toThrow(
      'Storage Data does not match version V025',
    );
  });
});
