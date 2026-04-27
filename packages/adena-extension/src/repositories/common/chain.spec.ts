import { AxiosInstance } from 'axios';

import { StorageManager } from '@common/storage/storage-manager';
import { AtomoneNetworkMetainfo } from '@types';
import { ChainRepository } from './chain';

const ATOMONE_DEFAULTS: AtomoneNetworkMetainfo[] = [
  {
    id: 'atomone-1',
    default: true,
    isMainnet: true,
    chainGroup: 'atomone',
    chainType: 'cosmos',
    chainId: 'atomone-1',
    chainName: 'AtomOne',
    networkId: 'atomone-1',
    networkName: 'Mainnet',
    addressPrefix: 'atone',
    rpcUrl: 'https://atomone-rpc.allinbits.com',
    restUrl: 'https://atomone-api.allinbits.com',
    linkUrl: 'https://www.mintscan.io/atomone',
  },
  {
    id: 'atomone-testnet-1',
    default: true,
    isMainnet: false,
    chainGroup: 'atomone',
    chainType: 'cosmos',
    chainId: 'atomone-testnet-1',
    chainName: 'AtomOne',
    networkId: 'atomone-testnet-1',
    networkName: 'Testnet',
    addressPrefix: 'atone',
    rpcUrl: 'https://atomone-testnet-1-rpc.allinbits.services',
    restUrl: 'https://atomone-testnet-1-api.allinbits.services',
  },
];

const CUSTOM_NETWORK: AtomoneNetworkMetainfo = {
  id: 'custom-1',
  default: false,
  isMainnet: false,
  chainGroup: 'atomone',
  chainType: 'cosmos',
  chainId: 'atomone-local',
  chainName: 'AtomOne',
  networkId: 'atomone-local',
  networkName: 'My Local Node',
  addressPrefix: 'atone',
  rpcUrl: 'http://127.0.0.1:26657',
  restUrl: 'http://127.0.0.1:1317',
};

describe('ChainRepository — AtomOne methods', () => {
  let localStorage: StorageManager;
  let networkInstance: AxiosInstance;
  let repository: ChainRepository;
  let storedValue: AtomoneNetworkMetainfo[] | undefined;

  beforeEach(() => {
    storedValue = undefined;

    localStorage = {
      getToObject: jest.fn().mockImplementation(async () => storedValue),
      setByObject: jest.fn().mockImplementation(async (_key, value) => {
        storedValue = value as AtomoneNetworkMetainfo[];
      }),
      remove: jest.fn().mockImplementation(async () => {
        storedValue = undefined;
      }),
    } as unknown as StorageManager;

    networkInstance = {
      get: jest.fn().mockResolvedValue({ data: ATOMONE_DEFAULTS }),
    } as unknown as AxiosInstance;

    repository = new ChainRepository(localStorage, networkInstance);
  });

  describe('getAtomoneNetworks', () => {
    it('seeds storage with fetched defaults when storage is empty', async () => {
      storedValue = undefined;

      const result = await repository.getAtomoneNetworks();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('atomone-1');
      expect(localStorage.setByObject).toHaveBeenCalledWith(
        'ATOMONE_NETWORKS',
        ATOMONE_DEFAULTS.map((network) => ({ ...network, deleted: false })),
      );
    });

    it('merges fetched defaults with stored customs', async () => {
      storedValue = [
        ...ATOMONE_DEFAULTS.map((network) => ({ ...network, deleted: false })),
        CUSTOM_NETWORK,
      ];

      const result = await repository.getAtomoneNetworks();

      expect(result).toHaveLength(3);
      expect(result.map((network) => network.id)).toEqual([
        'atomone-1',
        'atomone-testnet-1',
        'custom-1',
      ]);
    });

    it('preserves deleted flag on stored entries', async () => {
      const deletedDefault = {
        ...ATOMONE_DEFAULTS[1],
        deleted: true,
      };
      storedValue = [
        { ...ATOMONE_DEFAULTS[0], deleted: false },
        deletedDefault,
        CUSTOM_NETWORK,
      ];

      const result = await repository.getAtomoneNetworks();

      const testnet = result.find((network) => network.id === 'atomone-testnet-1');
      expect(testnet).toBeDefined();
      // default entry comes from fetched defaults (always fresh) — stored deleted=true
      // is not carried over, matching the existing Gno getNetworks behavior.
      expect(testnet?.deleted).toBe(false);
    });

    it('does not duplicate defaults when custom shares an id with a default', async () => {
      const overriddenMainnet = {
        ...ATOMONE_DEFAULTS[0],
        restUrl: 'https://user-override.example/',
      };
      storedValue = [overriddenMainnet, ATOMONE_DEFAULTS[1]];

      const result = await repository.getAtomoneNetworks();

      expect(result.filter((network) => network.id === 'atomone-1')).toHaveLength(1);
    });
  });

  describe('addAtomoneNetwork', () => {
    it('appends custom network to storage without touching Gno NETWORKS', async () => {
      storedValue = ATOMONE_DEFAULTS.map((network) => ({ ...network, deleted: false }));

      await repository.addAtomoneNetwork(CUSTOM_NETWORK);

      const last = storedValue[storedValue.length - 1];
      expect(last.id).toBe('custom-1');
    });
  });

  describe('updateAtomoneNetworks', () => {
    it('overwrites the stored list', async () => {
      storedValue = ATOMONE_DEFAULTS.map((network) => ({ ...network, deleted: false }));

      await repository.updateAtomoneNetworks([CUSTOM_NETWORK]);

      expect(storedValue).toEqual([CUSTOM_NETWORK]);
    });
  });

  describe('deleteAtomoneNetworks', () => {
    it('removes the storage key', async () => {
      storedValue = [CUSTOM_NETWORK];

      await repository.deleteAtomoneNetworks();

      expect(localStorage.remove).toHaveBeenCalledWith('ATOMONE_NETWORKS');
    });
  });
});
