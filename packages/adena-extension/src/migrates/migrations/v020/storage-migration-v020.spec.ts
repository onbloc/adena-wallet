import { StorageMigration020 } from './storage-migration-v020';

const BASE_DATA = {
  NETWORKS: [
    {
      id: 'test-13',
      default: true,
      main: false,
      chainId: 'test-13',
      chainName: 'test-13',
      networkId: 'test-13',
      networkName: 'Testnet 13',
      addressPrefix: 'g',
      rpcUrl: 'XXXXX',
      indexerUrl: 'https://indexer.test-13.gnoland.network:443',
      gnoUrl: 'https://test13.testnets.gno.land',
      apiUrl: 'https://test13.api.onbloc.xyz',
      linkUrl: 'https://gnoscan.io',
    },
  ],
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
  return { version: 19 as const, data: { ...BASE_DATA, ...overrides } };
}

describe('StorageMigration020', () => {
  it('version is 20', () => {
    expect(new StorageMigration020().version).toBe(20);
  });

  // test-13 was renamed to topaz in v022 and no longer exists in chains.json,
  // so this migration can no longer find a replacement and leaves the entry
  // untouched. v022 is what removes the stale test-13 network.
  it('leaves test-13 NETWORKS untouched once it is gone from chains.json', async () => {
    const result = await new StorageMigration020().up(
      makeInput({
        NETWORKS: [
          {
            id: 'test-13',
            default: true,
            main: false,
            chainId: 'test-13',
            chainName: 'test-13',
            networkId: 'test-13',
            networkName: 'Testnet 13',
            addressPrefix: 'g',
            rpcUrl: 'XXXXX',
            indexerUrl: 'https://indexer.test-13.gnoland.network:443',
            gnoUrl: 'https://test13.testnets.gno.land',
            apiUrl: 'https://test13.api.onbloc.xyz',
            linkUrl: 'https://gnoscan.io',
          },
        ],
      }),
    );
    const test13 = result.data.NETWORKS.find((n) => n.chainId === 'test-13');
    expect(test13).toBeDefined();
    expect(test13?.rpcUrl).toBe('XXXXX');
    expect(test13?.indexerUrl).toBe('https://indexer.test-13.gnoland.network:443');
  });

  it('throws on invalid v019 data', async () => {
    const bad: any = { version: 19, data: { ...BASE_DATA, SERIALIZED: null } };
    await expect(new StorageMigration020().up(bad)).rejects.toThrow(
      'Storage Data does not match version V019',
    );
  });
});
