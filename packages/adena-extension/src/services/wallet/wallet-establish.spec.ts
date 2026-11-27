/**
 * @vitest-environment node
 */
import {
  addConnectionToken,
  AgentPolicyKey,
  createConnectionToken,
  hasConnectionToken,
} from '@inject/agent-host/agent-host-settings';
import { resolveAgentPolicyKey } from '@inject/agent-host/agent-policy-key';
import { EstablishSite, WalletEstablishRepository } from '@repositories/wallet';
import { ChainRegistry } from 'adena-module';

import { WalletEstablishService } from './wallet-establish';

const KEY: AgentPolicyKey = { password: 'pw', salt: new Uint8Array(16).fill(2) };

vi.mock('adena-module', async importOriginal =>
  (await import('@inject/agent-host/agent-host-test-aead')).withFastAead(await importOriginal()),
);

// The unlocked popup resolves the wallet password; tests choose per case.
vi.mock('@inject/agent-host/agent-policy-key', () => ({
  resolveAgentPolicyKey: vi.fn(async () => null),
}));

const ACCOUNT = 'acc-1';
const HOSTNAME = 'dapp.example';

const GNO_PROFILES = [
  { chainGroup: 'gno', chainId: 'gnoland-1' },
  { chainGroup: 'gno', chainId: 'staging' },
  { chainGroup: 'gno', chainId: 'test-13' },
];

function makeChainRegistry(): ChainRegistry {
  return {
    getChainByChainId: vi.fn((chainId: string) => {
      if (GNO_PROFILES.some(p => p.chainId === chainId)) {
        return { chainGroup: 'gno' };
      }
      return undefined;
    }),
    listNetworkProfilesByChain: vi.fn((chainGroup: string) => {
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
    getEstablishedSites: vi.fn(async () => storage),
    updateEstablishedSites: vi.fn(async (next) => {
      storage = next;
    }),
    deleteEstablishedSites: vi.fn(async () => {
      storage = {};
    }),
    snapshot: () => storage,
  };
}

function site(overrides: Partial<EstablishSite>): EstablishSite {
  return {
    hostname: HOSTNAME,
    chainId: 'gnoland-1',
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
        [ACCOUNT]: [site({ chainId: 'gnoland-1', establishedTime: '100' })],
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
        [ACCOUNT]: [site({ hostname: 'other.example', chainId: 'gnoland-1' })],
      });

      await service.establishBy(ACCOUNT, 'gnoland-1', {
        hostname: HOSTNAME,
        accountId: ACCOUNT,
        appName: 'Test dApp',
      });

      const entries = repo.snapshot()[ACCOUNT];
      expect(entries).toHaveLength(2);
    });

    it('inserts a fresh entry when the account has no prior establishment', async () => {
      const { service, repo } = makeService();

      await service.establishBy(ACCOUNT, 'gnoland-1', {
        hostname: HOSTNAME,
        accountId: ACCOUNT,
        appName: 'Test dApp',
      });

      const entries = repo.snapshot()[ACCOUNT];
      expect(entries).toHaveLength(1);
      expect(entries[0].chainId).toBe('gnoland-1');
    });
  });

  describe('isEstablishedBy', () => {
    it('returns true via hostname-only check when chainId is omitted (legacy gate)', async () => {
      const { service } = makeService({
        [ACCOUNT]: [site({ chainId: 'gnoland-1' })],
      });

      expect(await service.isEstablishedBy(ACCOUNT, HOSTNAME)).toBe(true);
    });

    it('returns true for a sibling chainId in the same chainGroup', async () => {
      const { service } = makeService({
        [ACCOUNT]: [site({ chainId: 'gnoland-1' })],
      });

      // gnoland-1 already established — staging is a sibling, should resolve true.
      expect(await service.isEstablishedBy(ACCOUNT, HOSTNAME, 'staging')).toBe(true);
    });

    it('returns false when no entry exists for the hostname/chainGroup', async () => {
      const { service } = makeService({});

      expect(await service.isEstablishedBy(ACCOUNT, HOSTNAME, 'gnoland-1')).toBe(false);
    });
  });

  describe('unEstablishBy', () => {
    it('removes every hostname entry when chainId is omitted (legacy revoke)', async () => {
      const { service, repo } = makeService({
        [ACCOUNT]: [
          site({ chainId: 'gnoland-1' }),
          site({ hostname: 'other.example', chainId: 'gnoland-1' }),
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

      // gnoland-1 is a sibling of staging within 'gno' chainGroup.
      await service.unEstablishBy(ACCOUNT, HOSTNAME, 'gnoland-1');

      const entries = repo.snapshot()[ACCOUNT];
      expect(entries).toHaveLength(0);
    });
  });
});

describe('WalletEstablishService agent connections', () => {
  const AGENT_SITE = 'agent://claude-code.agent';
  const PROCESS = { pid: 1, start: 's' };

  const installStorage = (): void => {
    const store: Record<string, unknown> = {};
    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(store, items);
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            (Array.isArray(keys) ? keys : [keys]).forEach(key => delete store[key]);
          }),
        },
      },
    };
  };

  afterEach(() => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  });

  it('drops the grants of a disconnected agent, and only those', async () => {
    installStorage();
    vi.mocked(resolveAgentPolicyKey).mockResolvedValueOnce(KEY);
    const service = new WalletEstablishService(
      makeRepo({
        [ACCOUNT]: [
          {
            hostname: AGENT_SITE,
            chainId: 'gnoland-1',
            account: ACCOUNT,
            name: 'claude-code',
            favicon: null,
            establishedTime: '1',
          },
        ],
      }) as unknown as WalletEstablishRepository,
      makeChainRegistry(),
    );
    const kept = createConnectionToken();
    const dropped = createConnectionToken();
    await addConnectionToken(ACCOUNT, AGENT_SITE, dropped, PROCESS, false, KEY);
    await addConnectionToken(ACCOUNT, 'agent://cursor.agent', kept, PROCESS, false, KEY);

    await service.unEstablishBy(ACCOUNT, AGENT_SITE);

    await expect(hasConnectionToken(ACCOUNT, AGENT_SITE, dropped, PROCESS, KEY)).resolves.toBe(false);
    await expect(hasConnectionToken(ACCOUNT, 'agent://cursor.agent', kept, PROCESS, KEY)).resolves.toBe(
      true,
    );
  });

  it('drops every grant when a disconnect cannot get the password', async () => {
    installStorage();
    const service = new WalletEstablishService(
      makeRepo() as unknown as WalletEstablishRepository,
      makeChainRegistry(),
    );
    const other = createConnectionToken();
    await addConnectionToken(ACCOUNT, 'agent://cursor.agent', other, PROCESS, false, KEY);

    await service.unEstablishBy(ACCOUNT, AGENT_SITE);

    await expect(
      hasConnectionToken(ACCOUNT, 'agent://cursor.agent', other, PROCESS, KEY),
    ).resolves.toBe(false);
  });

  it('drops every grant when all connections are cleared', async () => {
    installStorage();
    const service = new WalletEstablishService(
      makeRepo() as unknown as WalletEstablishRepository,
      makeChainRegistry(),
    );
    const token = createConnectionToken();
    await addConnectionToken(ACCOUNT, AGENT_SITE, token, PROCESS, false, KEY);

    await service.clear();

    await expect(hasConnectionToken(ACCOUNT, AGENT_SITE, token, PROCESS, KEY)).resolves.toBe(false);
  });
});
