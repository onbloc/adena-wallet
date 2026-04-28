import { ChainRegistry } from 'adena-module';
import { EstablishSite, WalletEstablishRepository } from '@repositories/wallet';
import { WalletEstablishService } from './wallet-establish';

const ACCOUNT = 'acc-1';
const HOSTNAME = 'dapp.example';

const GNO_PROFILES = [
  { chainGroup: 'gno', chainId: 'gnoland1' },
  { chainGroup: 'gno', chainId: 'staging' },
  { chainGroup: 'gno', chainId: 'test12' },
];

function makeChainRegistry(): ChainRegistry {
  return {
    getChainByChainId: jest.fn((chainId: string) => {
      if (GNO_PROFILES.some((p) => p.chainId === chainId)) {
        return { chainGroup: 'gno' };
      }
      return undefined;
    }),
    listNetworkProfilesByChain: jest.fn((chainGroup: string) => {
      if (chainGroup === 'gno') {
        return GNO_PROFILES;
      }
      return [];
    }),
  } as unknown as ChainRegistry;
}

function makeRepo(initial: { [key: string]: EstablishSite[] } = {}) {
  let storage: { [key: string]: EstablishSite[] } = { ...initial };
  return {
    getEstablishedSites: jest.fn(async () => storage),
    updateEstablishedSites: jest.fn(async (next) => {
      storage = next;
    }),
    deleteEstablishedSites: jest.fn(async () => {
      storage = {};
    }),
    snapshot: () => storage,
  };
}

function site(overrides: Partial<EstablishSite>): EstablishSite {
  return {
    hostname: HOSTNAME,
    chainId: 'gnoland1',
    account: ACCOUNT,
    name: 'Test dApp',
    favicon: null,
    establishedTime: '0',
    ...overrides,
  };
}

function makeService(initial?: { [key: string]: EstablishSite[] }) {
  const repo = makeRepo(initial);
  const service = new WalletEstablishService(
    repo as unknown as WalletEstablishRepository,
    makeChainRegistry(),
  );
  return { service, repo };
}

describe('WalletEstablishService (Stage 8 — sibling-aware)', () => {
  describe('establishBy', () => {
    it('collapses existing entry in the same chainGroup for the hostname (sibling upsert)', async () => {
      const { service, repo } = makeService({
        [ACCOUNT]: [site({ chainId: 'gnoland1', establishedTime: '100' })],
      });

      await service.establishBy(ACCOUNT, 'staging', {
        hostname: HOSTNAME,
        accountId: ACCOUNT,
        appName: 'Test dApp',
      });

      const entries = repo.snapshot()[ACCOUNT];
      expect(entries).toHaveLength(1);
      expect(entries[0].chainId).toBe('staging');
    });

    it('keeps entries for other hostnames untouched', async () => {
      const { service, repo } = makeService({
        [ACCOUNT]: [site({ hostname: 'other.example', chainId: 'gnoland1' })],
      });

      await service.establishBy(ACCOUNT, 'gnoland1', {
        hostname: HOSTNAME,
        accountId: ACCOUNT,
        appName: 'Test dApp',
      });

      const entries = repo.snapshot()[ACCOUNT];
      expect(entries).toHaveLength(2);
    });

    it('inserts a fresh entry when the account has no prior establishment', async () => {
      const { service, repo } = makeService();

      await service.establishBy(ACCOUNT, 'gnoland1', {
        hostname: HOSTNAME,
        accountId: ACCOUNT,
        appName: 'Test dApp',
      });

      const entries = repo.snapshot()[ACCOUNT];
      expect(entries).toHaveLength(1);
      expect(entries[0].chainId).toBe('gnoland1');
    });
  });

  describe('isEstablishedBy', () => {
    it('returns true via hostname-only check when chainId is omitted (legacy gate)', async () => {
      const { service } = makeService({
        [ACCOUNT]: [site({ chainId: 'gnoland1' })],
      });

      expect(await service.isEstablishedBy(ACCOUNT, HOSTNAME)).toBe(true);
    });

    it('returns true for a sibling chainId in the same chainGroup', async () => {
      const { service } = makeService({
        [ACCOUNT]: [site({ chainId: 'gnoland1' })],
      });

      // gnoland1 already established — staging is a sibling, should resolve true.
      expect(await service.isEstablishedBy(ACCOUNT, HOSTNAME, 'staging')).toBe(true);
    });

    it('returns false when no entry exists for the hostname/chainGroup', async () => {
      const { service } = makeService({});

      expect(await service.isEstablishedBy(ACCOUNT, HOSTNAME, 'gnoland1')).toBe(false);
    });
  });

  describe('unEstablishBy', () => {
    it('removes every hostname entry when chainId is omitted (legacy revoke)', async () => {
      const { service, repo } = makeService({
        [ACCOUNT]: [
          site({ chainId: 'gnoland1' }),
          site({ hostname: 'other.example', chainId: 'gnoland1' }),
        ],
      });

      await service.unEstablishBy(ACCOUNT, HOSTNAME);

      const entries = repo.snapshot()[ACCOUNT];
      expect(entries).toHaveLength(1);
      expect(entries[0].hostname).toBe('other.example');
    });

    it('removes any sibling entry for the chainGroup when chainId is provided', async () => {
      const { service, repo } = makeService({
        [ACCOUNT]: [site({ chainId: 'staging' })],
      });

      // gnoland1 is a sibling of staging within 'gno' chainGroup.
      await service.unEstablishBy(ACCOUNT, HOSTNAME, 'gnoland1');

      const entries = repo.snapshot()[ACCOUNT];
      expect(entries).toHaveLength(0);
    });
  });
});
