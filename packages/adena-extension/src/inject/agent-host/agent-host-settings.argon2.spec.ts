/**
 * @vitest-environment node
 */
import { AGENT_POLICY_STORAGE_KEY } from './agent-host-protocol';
import { DEFAULT_AGENT_POLICY, readAgentPolicy, writeAgentPolicy } from './agent-host-settings';

vi.mock('./agent-policy-key', () => ({ resolveAgentPolicyKey: vi.fn(async () => null) }));

// The real Argon2id + XChaCha20-Poly1305 path; other specs use a fast key.
describe('agent policy with the wallet KDF', () => {
  it('round-trips under the password and rejects a tampered blob', { timeout: 60_000 }, async () => {
    const store: Record<string, unknown> = {};
    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(store, items);
          }),
          remove: vi.fn(async () => undefined),
        },
      },
    };
    const key = { password: 'pw', salt: new Uint8Array(16).fill(9) };

    await writeAgentPolicy(key, { masterRequestsAllowed: true });
    await expect(readAgentPolicy(key)).resolves.toMatchObject({ masterRequestsAllowed: true });
    await expect(readAgentPolicy({ ...key, password: 'wrong' })).resolves.toEqual(
      DEFAULT_AGENT_POLICY,
    );

    const sealed = store[AGENT_POLICY_STORAGE_KEY] as { ciphertext: string; nonce: string };
    const head = sealed.ciphertext[0] === 'A' ? 'B' : 'A';
    store[AGENT_POLICY_STORAGE_KEY] = { ...sealed, ciphertext: head + sealed.ciphertext.slice(1) };
    await expect(readAgentPolicy(key)).resolves.toEqual(DEFAULT_AGENT_POLICY);
  });
});
