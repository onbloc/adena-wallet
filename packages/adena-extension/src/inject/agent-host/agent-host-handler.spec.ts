/**
 * @vitest-environment node
 */
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { sha256, toBase64, toHex } from 'adena-module';

import { handleAgentHostMessage } from './agent-host-handler';
import {
  AGENT_CONNECTION_TOKENS_STORAGE_KEY,
  agentSiteName,
} from './agent-host-protocol';
import {
  addConnectionToken,
  AgentPolicyKey,
  createConnectionToken,
  writeAgentPolicy,
} from './agent-host-settings';

const KEY: AgentPolicyKey = { password: 'pw', salt: new Uint8Array(16).fill(3) };
const ACCOUNT = 'acc-1';
const SITE = agentSiteName('claude-code');
const PEER = { pid: 101, start: '1700000000.1', exe: '/usr/local/bin/adena-mcp' };

const core = {
  unlocked: true,
  established: true,
  getCurrentAccountId: vi.fn(async () => ACCOUNT),
  getAgentPolicyKey: vi.fn(async () => (core.unlocked ? KEY : null)),
  getInMemoryKey: vi.fn(async () => null),
  getCurrentAccount: vi.fn(async (): Promise<unknown> =>
    core.unlocked
      ? { id: ACCOUNT, type: 'HD_WALLET', getAddress: async () => 'g1master' }
      : undefined,
  ),
  getCurrentNetwork: vi.fn(async () => ({
    chainId: 'test13',
    rpcUrl: 'https://rpc.test13.example',
    addressPrefix: 'g',
  })),
  establishService: { isEstablishedBy: vi.fn(async () => core.established) },
};

vi.mock('adena-module', async importOriginal =>
  (await import('./agent-host-test-aead')).withFastAead(await importOriginal()),
);

vi.mock('@inject/message/methods/core', () => ({
  InjectCore: vi.fn(function InjectCore(): typeof core {
    return core;
  }),
}));

vi.mock('./agent-policy-key', () => ({ resolveAgentPolicyKey: vi.fn(async () => null) }));

const installChrome = (): Record<string, unknown> => {
  const store: Record<string, unknown> = {};
  const keysOf = (keys: string | string[]): string[] => (Array.isArray(keys) ? keys : [keys]);
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: { getManifest: () => ({ version: '9.9.9' }), getURL: (p: string) => `ext://id/${p}` },
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

let nextId = 0;
const call = (
  method: string,
  token: string | undefined,
  params: Record<string, unknown> = {},
): ReturnType<typeof handleAgentHostMessage> =>
  handleAgentHostMessage(new MemoryProvider(), {
    id: `r${++nextId}`,
    method,
    token,
    peer: PEER,
    params: { agent_name: 'claude-code', ...params },
  });

const connect = async (): Promise<string> => {
  const token = createConnectionToken();
  await addConnectionToken(ACCOUNT, SITE, token, PEER, false, KEY);
  return token;
};

beforeEach(() => {
  core.unlocked = true;
  core.established = true;
  installChrome();
});

describe('connection state', () => {
  it('reports policy only to a verified, unlocked connection', async () => {
    const token = await connect();
    await writeAgentPolicy(KEY, { vmRunAllowed: true, maxSpendLimitUgnot: '2000000' });

    const response = await call('get_status', token);
    expect(response?.result).toMatchObject({
      connected: true,
      locked: false,
      master_requests_allowed: false,
      max_spend_limit: '2000000ugnot',
      vm_run_allowed: true,
      chain_id: 'test13',
    });
  });

  it('tells a connected process of a locked wallet only to unlock', async () => {
    const token = await connect();
    core.unlocked = false;

    const status = await call('get_status', token);
    expect(status?.result).toEqual({
      version: '9.9.9',
      has_wallet: true,
      connected: true,
      locked: true,
    });

    const account = await call('get_account', token);
    expect(account?.error?.code).toBe('wallet_locked');
  });

  it('refuses an unknown process whether or not the wallet is locked', async () => {
    await connect();
    const stranger = createConnectionToken();

    core.unlocked = false;
    expect((await call('get_status', stranger))?.result).toMatchObject({ connected: false });
    expect((await call('get_account', stranger))?.error?.code).toBe('not_connected');

    core.unlocked = true;
    expect((await call('get_account', stranger))?.error?.code).toBe('not_connected');
  });

  it('does not let a planted index entry act once the wallet is unlocked', async () => {
    const store = installChrome();
    const token = createConnectionToken();
    store[AGENT_CONNECTION_TOKENS_STORAGE_KEY] = {
      [`${ACCOUNT}|${SITE}`]: [
        { hash: toHex(sha256(new TextEncoder().encode(token))), pid: PEER.pid, start: PEER.start },
      ],
    };

    core.unlocked = false;
    expect((await call('get_account', token))?.error?.code).toBe('wallet_locked');

    core.unlocked = true;
    expect((await call('get_account', token))?.error?.code).toBe('not_connected');
    expect((await call('connect', token))?.result).toBeUndefined();
  });
});

describe('policy checks', () => {
  const sessionParams = (allowPaths: string[]): Record<string, unknown> => {
    const key = new Uint8Array(33).fill(5);
    key[0] = 0x02;
    return {
      session_public_key: toBase64(key),
      allow_paths: allowPaths,
      spend_limit: '1000000ugnot',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
  };

  it('refuses vm/run sessions until the user allows them', async () => {
    const token = await connect();
    const response = await call('create_session', token, sessionParams(['vm/run']));
    expect(response?.error?.code).toBe('policy_violation');
    expect(response?.error?.message).toContain('Allow script (vm/run) sessions');
  });

  it('refuses master requests by default, before any popup', async () => {
    const token = await connect();
    const response = await call('send_transaction', token, {
      messages: [{ type: '/bank.MsgSend', value: { to_address: 'g1x', amount: '1ugnot' } }],
    });
    expect(response?.error?.code).toBe('master_requests_disabled');
  });
});
