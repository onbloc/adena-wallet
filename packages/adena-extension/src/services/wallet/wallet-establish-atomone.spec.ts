import { ChainRegistry } from 'adena-module';
import { EstablishSite, WalletEstablishAtomOneRepository } from '@repositories/wallet';
import { WalletEstablishAtomOneService } from './wallet-establish-atomone';

const ACCOUNT_ID = 'account-a';
const HOSTNAME = 'https://dapp.example';

const ATOMONE_GROUP_PROFILES = [
  { id: 'atomone-1:mainnet', chainGroup: 'atomone', chainId: 'atomone-1' },
  { id: 'atomone-testnet-1:testnet', chainGroup: 'atomone', chainId: 'atomone-testnet-1' },
];

const makeChainRegistry = (): ChainRegistry => {
  const getChainByChainId = jest.fn((chainId: string) => {
    if (chainId === 'atomone-1' || chainId === 'atomone-testnet-1') {
      return { chainGroup: 'atomone' };
    }
    return undefined;
  });

  const listNetworkProfilesByChain = jest.fn((chainGroup: string) => {
    if (chainGroup === 'atomone') {
      return ATOMONE_GROUP_PROFILES;
    }
    return [];
  });

  return {
    getChainByChainId,
    listNetworkProfilesByChain,
  } as unknown as ChainRegistry;
};

const makeRepository = (
  initialStore: { [accountId: string]: EstablishSite[] } = {},
): {
  repository: WalletEstablishAtomOneRepository;
  getStore: () => { [accountId: string]: EstablishSite[] };
} => {
  let store: { [accountId: string]: EstablishSite[] } = { ...initialStore };
  const repository = {
    getEstablishedSites: jest.fn(async () => store),
    updateEstablishedSites: jest.fn(async (next: { [accountId: string]: EstablishSite[] }) => {
      store = next;
    }),
    deleteEstablishedSites: jest.fn(async () => {
      store = {};
    }),
  } as unknown as WalletEstablishAtomOneRepository;

  return { repository, getStore: () => store };
};

describe('WalletEstablishAtomOneService', () => {
  describe('isEstablishedBy', () => {
    it('returns true when a sibling chain in the same group was previously established', async () => {
      const { repository } = makeRepository({
        [ACCOUNT_ID]: [
          {
            hostname: HOSTNAME,
            chainId: 'atomone-1',
            account: ACCOUNT_ID,
            name: 'Example',
            favicon: null,
            establishedTime: '1700000000000',
          },
        ],
      });
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      const result = await service.isEstablishedBy(ACCOUNT_ID, HOSTNAME, 'atomone-testnet-1');

      expect(result).toBe(true);
    });

    it('returns false when the hostname has not been established', async () => {
      const { repository } = makeRepository();
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      const result = await service.isEstablishedBy(ACCOUNT_ID, HOSTNAME, 'atomone-1');

      expect(result).toBe(false);
    });

    it('throws when the chainId is not registered in ChainRegistry', async () => {
      const { repository } = makeRepository();
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      await expect(
        service.isEstablishedBy(ACCOUNT_ID, HOSTNAME, 'unknown-chain-1'),
      ).rejects.toThrow('Unknown chainId: unknown-chain-1');
    });
  });

  describe('establishBy', () => {
    it('persists the actual requested chainId, not the chainGroup', async () => {
      const { repository, getStore } = makeRepository();
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      await service.establishBy(ACCOUNT_ID, 'atomone-testnet-1', {
        hostname: HOSTNAME,
        accountId: ACCOUNT_ID,
        appName: 'Example',
        favicon: null,
      });

      const stored = getStore()[ACCOUNT_ID];
      expect(stored).toHaveLength(1);
      expect(stored[0].chainId).toBe('atomone-testnet-1');
      expect(stored[0].hostname).toBe(HOSTNAME);
      expect(stored[0].name).toBe('Example');
    });

    it('replaces an existing sibling record on re-establish within the same group', async () => {
      const { repository, getStore } = makeRepository({
        [ACCOUNT_ID]: [
          {
            hostname: HOSTNAME,
            chainId: 'atomone-1',
            account: ACCOUNT_ID,
            name: 'Old',
            favicon: null,
            establishedTime: '1700000000000',
          },
        ],
      });
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      await service.establishBy(ACCOUNT_ID, 'atomone-testnet-1', {
        hostname: HOSTNAME,
        accountId: ACCOUNT_ID,
        appName: 'New',
        favicon: null,
      });

      const stored = getStore()[ACCOUNT_ID];
      expect(stored).toHaveLength(1);
      expect(stored[0].chainId).toBe('atomone-testnet-1');
      expect(stored[0].name).toBe('New');
    });
  });

  describe('unEstablishBy', () => {
    it('removes every sibling-chain record for the same hostname in one call', async () => {
      const { repository, getStore } = makeRepository({
        [ACCOUNT_ID]: [
          {
            hostname: HOSTNAME,
            chainId: 'atomone-1',
            account: ACCOUNT_ID,
            name: 'Mainnet record',
            favicon: null,
            establishedTime: '1700000000000',
          },
          {
            hostname: HOSTNAME,
            chainId: 'atomone-testnet-1',
            account: ACCOUNT_ID,
            name: 'Testnet record',
            favicon: null,
            establishedTime: '1700000000001',
          },
        ],
      });
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      await service.unEstablishBy(ACCOUNT_ID, HOSTNAME, 'atomone-1');

      expect(getStore()[ACCOUNT_ID]).toEqual([]);
    });

    it('preserves records for other hostnames', async () => {
      const OTHER_HOSTNAME = 'https://other.example';
      const { repository, getStore } = makeRepository({
        [ACCOUNT_ID]: [
          {
            hostname: HOSTNAME,
            chainId: 'atomone-1',
            account: ACCOUNT_ID,
            name: 'Target',
            favicon: null,
            establishedTime: '1700000000000',
          },
          {
            hostname: OTHER_HOSTNAME,
            chainId: 'atomone-1',
            account: ACCOUNT_ID,
            name: 'Keep me',
            favicon: null,
            establishedTime: '1700000000000',
          },
        ],
      });
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      await service.unEstablishBy(ACCOUNT_ID, HOSTNAME, 'atomone-1');

      const remaining = getStore()[ACCOUNT_ID];
      expect(remaining).toHaveLength(1);
      expect(remaining[0].hostname).toBe(OTHER_HOSTNAME);
    });
  });

  describe('getEstablishedSitesBy', () => {
    it('returns every AtomOne record registered for the accountId', async () => {
      const { repository } = makeRepository({
        [ACCOUNT_ID]: [
          {
            hostname: HOSTNAME,
            chainId: 'atomone-1',
            account: ACCOUNT_ID,
            name: 'A',
            favicon: null,
            establishedTime: '1700000000000',
          },
          {
            hostname: 'https://another.example',
            chainId: 'atomone-testnet-1',
            account: ACCOUNT_ID,
            name: 'B',
            favicon: null,
            establishedTime: '1700000000001',
          },
        ],
        'other-account': [
          {
            hostname: HOSTNAME,
            chainId: 'atomone-1',
            account: 'other-account',
            name: 'Other',
            favicon: null,
            establishedTime: '1700000000000',
          },
        ],
      });
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      const result = await service.getEstablishedSitesBy(ACCOUNT_ID);

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.chainId)).toEqual(['atomone-1', 'atomone-testnet-1']);
    });

    it('returns an empty array when no records exist for the accountId', async () => {
      const { repository } = makeRepository();
      const service = new WalletEstablishAtomOneService(repository, makeChainRegistry());

      const result = await service.getEstablishedSitesBy(ACCOUNT_ID);

      expect(result).toEqual([]);
    });
  });
});
