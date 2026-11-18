import {
  addConnectionToken,
  createConnectionToken,
  dropConnectionGrants,
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
  const PROCESS = { pid: 42, start: '1700000000.5' };

  it('accepts only tokens issued for the account, agent and process', async () => {
    installStorage();
    const token = createConnectionToken();

    await expect(hasConnectionToken('acc', SITE, token, PROCESS)).resolves.toBe(false);
    await addConnectionToken('acc', SITE, token, PROCESS, false);

    await expect(hasConnectionToken('acc', SITE, token, PROCESS)).resolves.toBe(true);
    await expect(hasConnectionToken('acc', SITE, undefined, PROCESS)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, createConnectionToken(), PROCESS)).resolves.toBe(
      false,
    );
    await expect(hasConnectionToken('other', SITE, token, PROCESS)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', 'agent://cursor.agent', token, PROCESS)).resolves.toBe(
      false,
    );
  });

  it('refuses a captured token replayed from another process', async () => {
    installStorage();
    const token = createConnectionToken();
    await addConnectionToken('acc', SITE, token, PROCESS, false);

    await expect(hasConnectionToken('acc', SITE, token, { ...PROCESS, pid: 43 })).resolves.toBe(
      false,
    );
    // Same pid, reused by a later process.
    await expect(
      hasConnectionToken('acc', SITE, token, { ...PROCESS, start: '1700000999.0' }),
    ).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, token, undefined)).resolves.toBe(false);
  });

  it('stores hashes, not tokens', async () => {
    const store = installStorage();
    const token = createConnectionToken();
    await addConnectionToken('acc', SITE, token, PROCESS, false);

    expect(JSON.stringify(store[AGENT_CONNECTION_TOKENS_STORAGE_KEY])).not.toContain(token);
  });

  it('keeps several processes, drops old ones on reset and caps the count', async () => {
    installStorage();
    const first = createConnectionToken();
    const second = createConnectionToken();
    const other = { pid: 7, start: '1' };

    await addConnectionToken('acc', SITE, first, PROCESS, false);
    await addConnectionToken('acc', SITE, second, other, false);
    await expect(hasConnectionToken('acc', SITE, first, PROCESS)).resolves.toBe(true);
    await expect(hasConnectionToken('acc', SITE, second, other)).resolves.toBe(true);

    const fresh = createConnectionToken();
    await addConnectionToken('acc', SITE, fresh, PROCESS, true);
    await expect(hasConnectionToken('acc', SITE, first, PROCESS)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, fresh, PROCESS)).resolves.toBe(true);

    const many = Array.from({ length: 9 }, () => createConnectionToken());
    for (const token of many) {
      await addConnectionToken('acc', SITE, token, PROCESS, false);
    }
    await expect(hasConnectionToken('acc', SITE, many[0], PROCESS)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, many[8], PROCESS)).resolves.toBe(true);
  });

  it('ignores grants stored in the previous unbound format', async () => {
    installStorage({ [AGENT_CONNECTION_TOKENS_STORAGE_KEY]: { [`acc|${SITE}`]: ['deadbeef'] } });
    await expect(hasConnectionToken('acc', SITE, 'x', PROCESS)).resolves.toBe(false);
  });

  it('creates distinct 32-byte hex tokens', () => {
    const token = createConnectionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(createConnectionToken()).not.toBe(token);
  });
});

describe('grant locking', () => {
  const SITE = 'agent://claude-code.agent';
  const PROCESS = { pid: 3, start: 'x' };

  afterEach(() => {
    delete (globalThis.navigator as unknown as { locks?: unknown }).locks;
  });

  it('runs every grant change under one Web Lock, one at a time', async () => {
    installStorage();
    const names: string[] = [];
    let held = false;
    let overlapped = false;
    let tail: Promise<unknown> = Promise.resolve();

    Object.defineProperty(globalThis.navigator, 'locks', {
      configurable: true,
      value: {
        request: (name: string, run: () => Promise<unknown>) => {
          names.push(name);
          const next = tail.then(async () => {
            overlapped = overlapped || held;
            held = true;
            try {
              return await run();
            } finally {
              held = false;
            }
          });
          tail = next.catch(() => undefined);
          return next;
        },
      },
    });

    const token = createConnectionToken();
    await Promise.all([
      addConnectionToken('acc', SITE, token, PROCESS, false),
      dropConnectionGrants('acc', SITE),
    ]);

    expect(names).toEqual(['adena-agent-connection-grants', 'adena-agent-connection-grants']);
    expect(overlapped).toBe(false);
    // The drop ran after the add, so nothing survives.
    await expect(hasConnectionToken('acc', SITE, token, PROCESS)).resolves.toBe(false);
  });
});
