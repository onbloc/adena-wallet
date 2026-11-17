import {
  addConnectionToken,
  createConnectionToken,
  getMaxSpendLimitUgnot,
  hasConnectionToken,
  isMasterRequestsAllowed,
  setMaxSpendLimitUgnot,
} from './agent-host-settings';
import {
  AGENT_CONNECTION_TOKENS_STORAGE_KEY,
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

describe('connection tokens', () => {
  const SITE = 'agent://claude-code.agent';

  it('accepts only tokens issued for the account and agent', async () => {
    installStorage();
    const token = createConnectionToken();

    await expect(hasConnectionToken('acc', SITE, token)).resolves.toBe(false);
    await addConnectionToken('acc', SITE, token, false);

    await expect(hasConnectionToken('acc', SITE, token)).resolves.toBe(true);
    await expect(hasConnectionToken('acc', SITE, undefined)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, createConnectionToken())).resolves.toBe(false);
    await expect(hasConnectionToken('other', SITE, token)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', 'agent://cursor.agent', token)).resolves.toBe(false);
  });

  it('stores hashes, not tokens', async () => {
    const store = installStorage();
    const token = createConnectionToken();
    await addConnectionToken('acc', SITE, token, false);

    expect(JSON.stringify(store[AGENT_CONNECTION_TOKENS_STORAGE_KEY])).not.toContain(token);
  });

  it('keeps several processes, drops old ones on reset and caps the count', async () => {
    installStorage();
    const first = createConnectionToken();
    const second = createConnectionToken();

    await addConnectionToken('acc', SITE, first, false);
    await addConnectionToken('acc', SITE, second, false);
    await expect(hasConnectionToken('acc', SITE, first)).resolves.toBe(true);

    const fresh = createConnectionToken();
    await addConnectionToken('acc', SITE, fresh, true);
    await expect(hasConnectionToken('acc', SITE, first)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, fresh)).resolves.toBe(true);

    const many = Array.from({ length: 9 }, () => createConnectionToken());
    for (const token of many) {
      await addConnectionToken('acc', SITE, token, false);
    }
    await expect(hasConnectionToken('acc', SITE, many[0])).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, many[8])).resolves.toBe(true);
  });

  it('creates distinct 32-byte hex tokens', () => {
    const token = createConnectionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(createConnectionToken()).not.toBe(token);
  });
});
