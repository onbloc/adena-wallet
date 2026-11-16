import { StorageMigration029 } from './storage-migration-v029';

type InputData = Parameters<StorageMigration029['up']>[0]['data'];

const BASE_DATA: InputData = {
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'staging',
  CURRENT_NETWORK_ID: 'staging',
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

function makeInput(overrides: Partial<InputData> = {}) {
  return { version: 28 as const, data: { ...BASE_DATA, ...overrides } };
}

function network(id: string, overrides: Partial<InputData['NETWORKS'][number]> = {}) {
  return {
    id,
    default: true,
    main: false,
    chainId: id,
    chainName: 'Gno.land',
    networkId: id,
    networkName: id,
    addressPrefix: 'g',
    rpcUrl: `https://rpc.${id}.example`,
    indexerUrl: '',
    gnoUrl: '',
    apiUrl: '',
    linkUrl: '',
    ...overrides,
  };
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

describe('StorageMigration029', () => {
  it('version is 29', () => {
    expect(new StorageMigration029().version).toBe(29);
  });

  it('moves a staging user onto onyx-1', async () => {
    const result = await new StorageMigration029().up(makeInput());
    expect(result.version).toBe(29);
    expect(result.data.CURRENT_CHAIN_ID).toBe('onyx-1');
    expect(result.data.CURRENT_NETWORK_ID).toBe('onyx-1');
  });

  it('does not change CURRENT_CHAIN_ID when it is not staging', async () => {
    const result = await new StorageMigration029().up(
      makeInput({ CURRENT_CHAIN_ID: 'gnoland-1', CURRENT_NETWORK_ID: 'gnoland-1' }),
    );
    expect(result.data.CURRENT_CHAIN_ID).toBe('gnoland-1');
    expect(result.data.CURRENT_NETWORK_ID).toBe('gnoland-1');
  });

  it('drops staging networks and keeps the rest untouched', async () => {
    const mainnet = network('gnoland-1', { main: true, rpcUrl: 'https://my.rpc.example' });
    const custom = network('custom', { default: false, chainId: 'custom-1' });
    const result = await new StorageMigration029().up(
      makeInput({
        NETWORKS: [
          mainnet,
          network('staging'),
          network('custom-staging', { default: false, chainId: 'staging' }),
          custom,
        ],
      }),
    );
    expect(result.data.NETWORKS).toEqual([mainnet, custom]);
  });

  it('removes ESTABLISH_SITES entries for staging and keeps the rest', async () => {
    const result = await new StorageMigration029().up(
      makeInput({
        ESTABLISH_SITES: {
          'acc-1': [site('staging')],
          'acc-2': [site('staging'), site('gnoland-1')],
        },
      }),
    );
    expect(result.data.ESTABLISH_SITES).toEqual({ 'acc-2': [site('gnoland-1')] });
  });

  it('removes ACCOUNT_TOKEN_METAINFOS entries for staging', async () => {
    const result = await new StorageMigration029().up(
      makeInput({
        ACCOUNT_TOKEN_METAINFOS: { 'acc-1': [token('staging'), token('gnoland-1')] },
      }),
    );
    expect(result.data.ACCOUNT_TOKEN_METAINFOS).toEqual({ 'acc-1': [token('gnoland-1')] });
  });

  it('removes SESSIONS entries for staging', async () => {
    const result = await new StorageMigration029().up(
      makeInput({
        SESSIONS: { g1staging: session('staging'), g1mainnet: session('gnoland-1') },
      }),
    );
    expect(result.data.SESSIONS).toEqual({ g1mainnet: session('gnoland-1') });
  });

  it('removes ACCOUNT_GRC721_COLLECTIONS entries for staging', async () => {
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
    const result = await new StorageMigration029().up(
      makeInput({
        ACCOUNT_GRC721_COLLECTIONS: {
          'acc-1': { staging: collection('staging') },
          'acc-2': { staging: collection('staging'), 'gnoland-1': collection('gnoland-1') },
        },
      }),
    );
    expect(result.data.ACCOUNT_GRC721_COLLECTIONS).toEqual({
      'acc-2': { 'gnoland-1': collection('gnoland-1') },
    });
  });

  it('removes ACCOUNT_GRC721_PINNED_PACKAGES entries for staging', async () => {
    const result = await new StorageMigration029().up(
      makeInput({
        ACCOUNT_GRC721_PINNED_PACKAGES: {
          'acc-1': { staging: ['gno.land/r/test/nft'], 'gnoland-1': ['gno.land/r/other/nft'] },
        },
      }),
    );
    expect(result.data.ACCOUNT_GRC721_PINNED_PACKAGES).toEqual({
      'acc-1': { 'gnoland-1': ['gno.land/r/other/nft'] },
    });
  });

  it('preserves unrelated v028 fields without loss', async () => {
    const result = await new StorageMigration029().up(makeInput());
    expect(result.data.SERIALIZED).toBe(BASE_DATA.SERIALIZED);
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe(BASE_DATA.ENCRYPTED_STORED_PASSWORD);
    expect(result.data.CURRENT_ACCOUNT_ID).toBe(BASE_DATA.CURRENT_ACCOUNT_ID);
    expect(result.data.ACCOUNT_NAMES).toEqual(BASE_DATA.ACCOUNT_NAMES);
    expect(result.data.ADDRESS_BOOK).toBe(BASE_DATA.ADDRESS_BOOK);
    expect(result.data.KDF_SALT).toBe(BASE_DATA.KDF_SALT);
  });

  it('throws when required v028 keys are missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { KDF_SALT, ...withoutKdfSalt } = BASE_DATA;
    const bad: any = { version: 28, data: withoutKdfSalt };
    await expect(new StorageMigration029().up(bad)).rejects.toThrow(
      'Storage Data does not match version V028',
    );
  });
});
