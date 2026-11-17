import {
  getAgentBinding,
  getMaxSpendLimitUgnot,
  isMasterRequestsAllowed,
  setAgentBinding,
  setMaxSpendLimitUgnot,
} from './agent-host-settings';
import {
  AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT,
  AGENT_MASTER_REQUESTS_STORAGE_KEY,
  AGENT_MAX_SPEND_LIMIT_STORAGE_KEY,
} from './agent-host-protocol';

const installStorage = (initial: Record<string, unknown> = {}): Record<string, unknown> => {
  const store: Record<string, unknown> = { ...initial };
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: jest.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
        set: jest.fn(async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        }),
      },
    },
  };
  return store;
};

describe('isMasterRequestsAllowed', () => {
  it('is off when the setting was never saved', async () => {
    installStorage();
    await expect(isMasterRequestsAllowed()).resolves.toBe(false);
  });

  it('is on only for an explicit true', async () => {
    installStorage({ [AGENT_MASTER_REQUESTS_STORAGE_KEY]: true });
    await expect(isMasterRequestsAllowed()).resolves.toBe(true);

    installStorage({ [AGENT_MASTER_REQUESTS_STORAGE_KEY]: 'true' });
    await expect(isMasterRequestsAllowed()).resolves.toBe(false);
  });
});

describe('max spend limit', () => {
  it('defaults when unset or malformed', async () => {
    installStorage();
    await expect(getMaxSpendLimitUgnot()).resolves.toBe(AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT);

    installStorage({ [AGENT_MAX_SPEND_LIMIT_STORAGE_KEY]: '-5' });
    await expect(getMaxSpendLimitUgnot()).resolves.toBe(AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT);
  });

  it('stores a positive integer and refuses anything else', async () => {
    installStorage();
    await setMaxSpendLimitUgnot('2500000');
    await expect(getMaxSpendLimitUgnot()).resolves.toBe('2500000');

    for (const value of ['0', '1.5', '', '01']) {
      await expect(setMaxSpendLimitUgnot(value)).rejects.toThrow();
    }
  });
});

describe('agent bindings', () => {
  it('is undefined until a connection is bound, then per account and site', async () => {
    installStorage();
    await expect(getAgentBinding('acc', 'agent://a.agent')).resolves.toBeUndefined();

    await setAgentBinding('acc', 'agent://a.agent', '/bin/adena-mcp');
    await setAgentBinding('acc', 'agent://b.agent', '');

    await expect(getAgentBinding('acc', 'agent://a.agent')).resolves.toBe('/bin/adena-mcp');
    await expect(getAgentBinding('acc', 'agent://b.agent')).resolves.toBe('');
    await expect(getAgentBinding('other', 'agent://a.agent')).resolves.toBeUndefined();
  });
});
