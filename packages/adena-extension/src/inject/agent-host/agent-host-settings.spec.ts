/**
 * @vitest-environment node
 */
import {
  AGENT_CONNECTION_GRANTS_STORAGE_KEY,
  AGENT_CONNECTION_TOKENS_STORAGE_KEY,
  AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT,
  AGENT_LEGACY_STORAGE_KEYS,
  AGENT_POLICY_STORAGE_KEY,
} from './agent-host-protocol';
import {
  addConnectionToken,
  AgentPolicyKey,
  clearAgentStorage,
  createConnectionToken,
  DEFAULT_AGENT_POLICY,
  dropConnectionGrants,
  hasConnectionToken,
  hasUnverifiedConnectionToken,
  readAgentPolicy,
  reencryptAgentStorage,
  writeAgentPolicy,
} from './agent-host-settings';

vi.mock('adena-module', async importOriginal =>
  (await import('./agent-host-test-aead')).withFastAead(await importOriginal()),
);

vi.mock('./agent-policy-key', () => ({
  resolveAgentPolicyKey: vi.fn(async () => null),
}));

const KEY: AgentPolicyKey = { password: 'correct horse', salt: new Uint8Array(16).fill(1) };
const OTHER_KEY: AgentPolicyKey = { password: 'another password', salt: KEY.salt };

const installStorage = (initial: Record<string, unknown> = {}): Record<string, unknown> => {
  const store: Record<string, unknown> = { ...initial };
  const keysOf = (keys: string | string[]): string[] => (Array.isArray(keys) ? keys : [keys]);
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: vi.fn(async (keys: string | string[]) =>
          Object.fromEntries(keysOf(keys).filter(k => k in store).map(k => [k, store[k]])),
        ),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          keysOf(keys).forEach(k => delete store[k]);
        }),
      },
    },
  };
  return store;
};

describe('agent policy', () => {
  it('is the safe default when unset, locked or tampered with', async () => {
    const store = installStorage();
    await expect(readAgentPolicy(KEY)).resolves.toEqual(DEFAULT_AGENT_POLICY);

    await writeAgentPolicy(KEY, { masterRequestsAllowed: true, vmRunAllowed: true });
    await expect(readAgentPolicy(null)).resolves.toEqual(DEFAULT_AGENT_POLICY);
    await expect(readAgentPolicy(OTHER_KEY)).resolves.toEqual(DEFAULT_AGENT_POLICY);

    const sealed = store[AGENT_POLICY_STORAGE_KEY] as { ciphertext: string; nonce: string };
    const flipped = `${sealed.ciphertext[0] === 'A' ? 'B' : 'A'}${sealed.ciphertext.slice(1)}`;
    store[AGENT_POLICY_STORAGE_KEY] = { ...sealed, ciphertext: flipped };
    await expect(readAgentPolicy(KEY)).resolves.toEqual(DEFAULT_AGENT_POLICY);
  });

  it('ignores plaintext values, including those of earlier builds', async () => {
    installStorage({
      [AGENT_POLICY_STORAGE_KEY]: { masterRequestsAllowed: true },
      AGENT_HOST_ALLOW_MASTER_REQUESTS: true,
      AGENT_HOST_MAX_SPEND_LIMIT: '999999999999',
    });
    await expect(readAgentPolicy(KEY)).resolves.toEqual(DEFAULT_AGENT_POLICY);
  });

  it('stores the policy encrypted and removes the legacy keys', async () => {
    const store = installStorage({ AGENT_HOST_ALLOW_MASTER_REQUESTS: true });

    const saved = await writeAgentPolicy(KEY, { maxSpendLimitUgnot: '2500000' });
    expect(saved).toEqual({ ...DEFAULT_AGENT_POLICY, maxSpendLimitUgnot: '2500000' });
    await expect(readAgentPolicy(KEY)).resolves.toEqual(saved);

    expect(JSON.stringify(store[AGENT_POLICY_STORAGE_KEY])).not.toContain('2500000');
    AGENT_LEGACY_STORAGE_KEYS.forEach(key => expect(store).not.toHaveProperty(key));
  });

  it('refuses a malformed maximum', async () => {
    installStorage();
    for (const value of ['0', '1.5', '', '01']) {
      await expect(writeAgentPolicy(KEY, { maxSpendLimitUgnot: value })).rejects.toThrow();
    }
    await expect(readAgentPolicy(KEY)).resolves.toMatchObject({
      maxSpendLimitUgnot: AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT,
    });
  });

  it('does not accept the grants blob as a policy', async () => {
    const store = installStorage();
    await addConnectionToken('acc', 'agent://a.agent', createConnectionToken(), { pid: 1, start: 's' }, false, KEY);
    store[AGENT_POLICY_STORAGE_KEY] = store[AGENT_CONNECTION_GRANTS_STORAGE_KEY];
    await expect(readAgentPolicy(KEY)).resolves.toEqual(DEFAULT_AGENT_POLICY);
  });
});

describe('connection tokens', () => {
  const SITE = 'agent://claude-code.agent';
  const PROCESS = { pid: 42, start: '1700000000.5' };

  it('accepts only tokens issued for the account, agent and process', async () => {
    installStorage();
    const token = createConnectionToken();

    await expect(hasConnectionToken('acc', SITE, token, PROCESS, KEY)).resolves.toBe(false);
    await addConnectionToken('acc', SITE, token, PROCESS, false, KEY);

    await expect(hasConnectionToken('acc', SITE, token, PROCESS, KEY)).resolves.toBe(true);
    await expect(hasConnectionToken('acc', SITE, undefined, PROCESS, KEY)).resolves.toBe(false);
    await expect(
      hasConnectionToken('acc', SITE, createConnectionToken(), PROCESS, KEY),
    ).resolves.toBe(false);
    await expect(hasConnectionToken('other', SITE, token, PROCESS, KEY)).resolves.toBe(false);
    await expect(
      hasConnectionToken('acc', 'agent://cursor.agent', token, PROCESS, KEY),
    ).resolves.toBe(false);
  });

  it('refuses a captured token replayed from another process', async () => {
    installStorage();
    const token = createConnectionToken();
    await addConnectionToken('acc', SITE, token, PROCESS, false, KEY);

    await expect(
      hasConnectionToken('acc', SITE, token, { ...PROCESS, pid: 43 }, KEY),
    ).resolves.toBe(false);
    // Same pid, reused by a later process.
    await expect(
      hasConnectionToken('acc', SITE, token, { ...PROCESS, start: '1700000999.0' }, KEY),
    ).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, token, undefined, KEY)).resolves.toBe(false);
  });

  it('stores hashes, not tokens', async () => {
    const store = installStorage();
    const token = createConnectionToken();
    await addConnectionToken('acc', SITE, token, PROCESS, false, KEY);

    expect(JSON.stringify(store[AGENT_CONNECTION_TOKENS_STORAGE_KEY])).not.toContain(token);
    expect(JSON.stringify(store[AGENT_CONNECTION_GRANTS_STORAGE_KEY])).not.toContain(token);
  });

  it('does not trust a grant planted in the unencrypted index', async () => {
    const token = createConnectionToken();
    const store = installStorage();
    await addConnectionToken('acc', SITE, createConnectionToken(), PROCESS, false, KEY);

    const planted = { pid: 7, start: 'planted' };
    const index = store[AGENT_CONNECTION_TOKENS_STORAGE_KEY] as Record<string, unknown[]>;
    const { sha256, toHex } = await import('adena-module');
    index[`acc|${SITE}`] = [
      { hash: toHex(sha256(new TextEncoder().encode(token))), pid: 7, start: 'planted' },
    ];

    // The index only lets a locked wallet tell the process to unlock.
    await expect(hasUnverifiedConnectionToken('acc', SITE, token, planted)).resolves.toBe(true);
    await expect(hasConnectionToken('acc', SITE, token, planted, KEY)).resolves.toBe(false);
  });

  it('ignores grants encrypted under another password', async () => {
    installStorage();
    const token = createConnectionToken();
    await addConnectionToken('acc', SITE, token, PROCESS, false, OTHER_KEY);
    await expect(hasConnectionToken('acc', SITE, token, PROCESS, KEY)).resolves.toBe(false);
  });

  it('keeps several processes, drops old ones on reset and caps the count', async () => {
    installStorage();
    const first = createConnectionToken();
    const second = createConnectionToken();
    const other = { pid: 7, start: '1' };

    await addConnectionToken('acc', SITE, first, PROCESS, false, KEY);
    await addConnectionToken('acc', SITE, second, other, false, KEY);
    await expect(hasConnectionToken('acc', SITE, first, PROCESS, KEY)).resolves.toBe(true);
    await expect(hasConnectionToken('acc', SITE, second, other, KEY)).resolves.toBe(true);

    const fresh = createConnectionToken();
    await addConnectionToken('acc', SITE, fresh, PROCESS, true, KEY);
    await expect(hasConnectionToken('acc', SITE, first, PROCESS, KEY)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, fresh, PROCESS, KEY)).resolves.toBe(true);

    const many = Array.from({ length: 9 }, () => createConnectionToken());
    for (const token of many) {
      await addConnectionToken('acc', SITE, token, PROCESS, false, KEY);
    }
    await expect(hasConnectionToken('acc', SITE, many[0], PROCESS, KEY)).resolves.toBe(false);
    await expect(hasConnectionToken('acc', SITE, many[8], PROCESS, KEY)).resolves.toBe(true);
  });

  it('drops every grant when a single drop has no password', async () => {
    installStorage();
    const kept = createConnectionToken();
    await addConnectionToken('acc', 'agent://cursor.agent', kept, PROCESS, false, KEY);

    await dropConnectionGrants('acc', SITE, null);

    await expect(
      hasConnectionToken('acc', 'agent://cursor.agent', kept, PROCESS, KEY),
    ).resolves.toBe(false);
    await expect(
      hasUnverifiedConnectionToken('acc', 'agent://cursor.agent', kept, PROCESS),
    ).resolves.toBe(false);
  });

  it('drops only the named connection with the password', async () => {
    installStorage();
    const kept = createConnectionToken();
    const dropped = createConnectionToken();
    await addConnectionToken('acc', 'agent://cursor.agent', kept, PROCESS, false, KEY);
    await addConnectionToken('acc', SITE, dropped, PROCESS, false, KEY);

    await dropConnectionGrants('acc', SITE, KEY);

    await expect(hasConnectionToken('acc', SITE, dropped, PROCESS, KEY)).resolves.toBe(false);
    await expect(hasUnverifiedConnectionToken('acc', SITE, dropped, PROCESS)).resolves.toBe(false);
    await expect(
      hasConnectionToken('acc', 'agent://cursor.agent', kept, PROCESS, KEY),
    ).resolves.toBe(true);
  });

  it('creates distinct 32-byte hex tokens', () => {
    const token = createConnectionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(createConnectionToken()).not.toBe(token);
  });
});

describe('password change and reset', () => {
  const SITE = 'agent://claude-code.agent';
  const PROCESS = { pid: 42, start: 's' };

  it('re-encrypts the policy and grants for the new password', async () => {
    installStorage();
    const token = createConnectionToken();
    await writeAgentPolicy(KEY, { masterRequestsAllowed: true });
    await addConnectionToken('acc', SITE, token, PROCESS, false, KEY);

    await reencryptAgentStorage(KEY, OTHER_KEY);

    await expect(readAgentPolicy(OTHER_KEY)).resolves.toMatchObject({
      masterRequestsAllowed: true,
    });
    await expect(hasConnectionToken('acc', SITE, token, PROCESS, OTHER_KEY)).resolves.toBe(true);
    await expect(readAgentPolicy(KEY)).resolves.toEqual(DEFAULT_AGENT_POLICY);
  });

  it('drops what the old password cannot open', async () => {
    const store = installStorage();
    await writeAgentPolicy(KEY, { masterRequestsAllowed: true });
    await addConnectionToken('acc', SITE, createConnectionToken(), PROCESS, false, KEY);

    await reencryptAgentStorage(null, OTHER_KEY);

    expect(store).not.toHaveProperty(AGENT_POLICY_STORAGE_KEY);
    expect(store).not.toHaveProperty(AGENT_CONNECTION_GRANTS_STORAGE_KEY);
    expect(store).not.toHaveProperty(AGENT_CONNECTION_TOKENS_STORAGE_KEY);
  });

  it('clears everything on reset', async () => {
    const store = installStorage({ AGENT_HOST_MAX_SPEND_LIMIT: '1' });
    await writeAgentPolicy(KEY, { vmRunAllowed: true });
    await addConnectionToken('acc', SITE, createConnectionToken(), PROCESS, false, KEY);

    await clearAgentStorage();

    expect(Object.keys(store)).toEqual([]);
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
            }
            finally {
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
      addConnectionToken('acc', SITE, token, PROCESS, false, KEY),
      dropConnectionGrants('acc', SITE, KEY),
    ]);

    expect(names).toEqual(['adena-agent-connection-grants', 'adena-agent-connection-grants']);
    expect(overlapped).toBe(false);
    // The drop ran after the add, so nothing survives.
    await expect(hasConnectionToken('acc', SITE, token, PROCESS, KEY)).resolves.toBe(false);
  });
});
