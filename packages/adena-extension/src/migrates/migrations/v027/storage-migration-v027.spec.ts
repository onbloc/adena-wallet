import { StorageMigration027 } from './storage-migration-v027';

function gnolandMainnet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gnoland-1',
    default: true,
    main: true,
    chainId: 'gnoland-1',
    chainName: 'Gno.land',
    networkId: 'gnoland-1',
    networkName: 'Mainnet',
    addressPrefix: 'g',
    rpcUrl: 'https://rpc.onbloc.xyz:443',
    indexerUrl: 'https://indexer.onbloc.xyz',
    gnoUrl: 'https://gno.land',
    apiUrl: 'https://api.onbloc.xyz',
    linkUrl: 'https://gnoscan.io',
    ...overrides,
  };
}

const BASE_DATA = {
  NETWORKS: [gnolandMainnet()] as Parameters<StorageMigration027['up']>[0]['data']['NETWORKS'],
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
};

function makeInput(overrides: Partial<typeof BASE_DATA> = {}) {
  return { version: 26 as const, data: { ...BASE_DATA, ...overrides } };
}

describe('StorageMigration027', () => {
  it('version is 27', () => {
    expect(new StorageMigration027().version).toBe(27);
  });

  it('migrates an existing onbloc default mainnet to rpc.gno.land with onbloc fallback', async () => {
    const result = await new StorageMigration027().up(makeInput());
    expect(result.version).toBe(27);
    const mainnet = result.data.NETWORKS.find((n) => n.id === 'gnoland-1');
    expect(mainnet?.rpcUrl).toBe('https://rpc.gno.land:443');
    expect(mainnet?.fallbackRPCUrl).toBe('https://rpc.onbloc.xyz:443');
  });

  it('leaves a genuinely customized gnoland-1 rpcUrl untouched', async () => {
    const custom = gnolandMainnet({ rpcUrl: 'https://my.custom.rpc:443' });
    const result = await new StorageMigration027().up(makeInput({ NETWORKS: [custom] }));
    const mainnet = result.data.NETWORKS.find((n) => n.id === 'gnoland-1');
    expect(mainnet?.rpcUrl).toBe('https://my.custom.rpc:443');
    expect(mainnet?.fallbackRPCUrl).toBeUndefined();
  });

  it('does not touch networks other than the default mainnet', async () => {
    const other = gnolandMainnet({
      id: 'custom',
      default: false,
      main: false,
      chainId: 'custom-1',
      networkId: 'custom-1',
      rpcUrl: 'https://rpc.onbloc.xyz:443',
    });
    const result = await new StorageMigration027().up(makeInput({ NETWORKS: [other] }));
    const network = result.data.NETWORKS.find((n) => n.id === 'custom');
    expect(network?.rpcUrl).toBe('https://rpc.onbloc.xyz:443');
    expect(network?.fallbackRPCUrl).toBeUndefined();
  });

  it('preserves unrelated v026 fields without loss', async () => {
    const result = await new StorageMigration027().up(makeInput());
    expect(result.data.SERIALIZED).toBe(BASE_DATA.SERIALIZED);
    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe(BASE_DATA.ENCRYPTED_STORED_PASSWORD);
    expect(result.data.CURRENT_ACCOUNT_ID).toBe(BASE_DATA.CURRENT_ACCOUNT_ID);
    expect(result.data.ACCOUNT_NAMES).toEqual(BASE_DATA.ACCOUNT_NAMES);
    expect(result.data.ADDRESS_BOOK).toBe(BASE_DATA.ADDRESS_BOOK);
    expect(result.data.KDF_SALT).toBe(BASE_DATA.KDF_SALT);
  });

  it('throws when required v026 keys are missing', async () => {
    const { KDF_SALT, ...withoutKdfSalt } = BASE_DATA;
    const bad: any = { version: 26, data: withoutKdfSalt };
    await expect(new StorageMigration027().up(bad)).rejects.toThrow(
      'Storage Data does not match version V026',
    );
  });
});
