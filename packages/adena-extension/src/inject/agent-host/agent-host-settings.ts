import {
  decryptXChacha20,
  EncryptedData,
  encryptXChacha20,
  Random,
  sha256,
  toHex,
} from 'adena-module';

import {
  AGENT_CONNECTION_GRANTS_STORAGE_KEY,
  AGENT_CONNECTION_TOKENS_STORAGE_KEY,
  AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT,
  AGENT_LEGACY_STORAGE_KEYS,
  AGENT_POLICY_STORAGE_KEY,
} from './agent-host-protocol';
import { AgentPolicyKey, resolveAgentPolicyKey } from './agent-policy-key';

export type { AgentPolicyKey } from './agent-policy-key';

// chrome.storage.local has no integrity protection: a process of the same user
// can edit it while the browser is closed. The policy and the connection
// grants are therefore stored encrypted (XChaCha20-Poly1305 under the wallet
// password's Argon2id key), and anything that does not decrypt is ignored.
// Rolling back to an older valid ciphertext is not prevented.

const POLICY_KIND = 'agent-policy-v1';
const GRANTS_KIND = 'agent-grants-v1';

const UGNOT_INTEGER_PATTERN = /^[1-9][0-9]*$/;

export interface AgentPolicy {
  masterRequestsAllowed: boolean;
  maxSpendLimitUgnot: string;
  vmRunAllowed: boolean;
}

// Off by default: agents sign with session accounts, within the default cap,
// and cannot get script (vm/run) sessions unless the user allows them.
export const DEFAULT_AGENT_POLICY: Readonly<AgentPolicy> = Object.freeze({
  masterRequestsAllowed: false,
  maxSpendLimitUgnot: AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT,
  vmRunAllowed: false,
});

export const isValidMaxSpendLimit = (ugnot: string): boolean => UGNOT_INTEGER_PATTERN.test(ugnot);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEncryptedData = (value: unknown): value is EncryptedData =>
  isRecord(value) && typeof value.ciphertext === 'string' && typeof value.nonce === 'string';

const keyFingerprint = (key: AgentPolicyKey): string =>
  `${toHex(sha256(new TextEncoder().encode(key.password)))}:${toHex(key.salt)}`;

// Decrypted plaintexts by key and ciphertext, so Argon2id runs once per blob;
// a changed or replaced blob misses and is decrypted and checked again.
const MAX_OPENED = 8;
const opened = new Map<string, string>();

const cacheKeyOf = (kind: string, key: AgentPolicyKey, sealed: EncryptedData): string =>
  `${kind}|${keyFingerprint(key)}|${sealed.nonce}|${sealed.ciphertext}`;

const remember = (cacheKey: string, plaintext: string): void => {
  opened.delete(cacheKey);
  opened.set(cacheKey, plaintext);
  while (opened.size > MAX_OPENED) {
    opened.delete(opened.keys().next().value as string);
  }
};

const seal = async (
  kind: string,
  body: Record<string, unknown>,
  key: AgentPolicyKey,
): Promise<EncryptedData> => {
  const plaintext = JSON.stringify({ ...body, kind });
  const sealed = await encryptXChacha20(plaintext, key.password, key.salt);
  remember(cacheKeyOf(kind, key, sealed), plaintext);
  return sealed;
};

// Returns null unless value decrypts under key and carries kind, so one blob
// cannot stand in for the other.
const open = async (
  kind: string,
  value: unknown,
  key: AgentPolicyKey,
): Promise<Record<string, unknown> | null> => {
  if (!isEncryptedData(value)) {
    return null;
  }
  const cacheKey = cacheKeyOf(kind, key, value);
  try {
    const plaintext
      = opened.get(cacheKey) ?? (await decryptXChacha20(value, key.password, key.salt));
    const payload: unknown = JSON.parse(plaintext);
    if (!isRecord(payload) || payload.kind !== kind) {
      return null;
    }
    remember(cacheKey, plaintext);
    return payload;
  }
  catch {
    return null;
  }
};

const readStored = async (storageKey: string): Promise<unknown> => {
  const stored = await chrome.storage.local.get(storageKey);
  return stored?.[storageKey];
};

const withLock = async <T>(name: string, update: () => Promise<T>): Promise<T> => {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  return locks ? locks.request(name, update) : update();
};

const POLICY_LOCK = 'adena-agent-policy';

const policyFrom = (payload: Record<string, unknown> | null): AgentPolicy => {
  if (!payload) {
    return { ...DEFAULT_AGENT_POLICY };
  }
  const maxSpend = payload.maxSpendLimitUgnot;
  return {
    masterRequestsAllowed: payload.masterRequestsAllowed === true,
    maxSpendLimitUgnot:
      typeof maxSpend === 'string' && isValidMaxSpendLimit(maxSpend)
        ? maxSpend
        : AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT,
    vmRunAllowed: payload.vmRunAllowed === true,
  };
};

// Without a key (a locked wallet) or with a missing or tampered blob, the
// policy is the safe default.
export const readAgentPolicy = async (key: AgentPolicyKey | null): Promise<AgentPolicy> => {
  if (!key) {
    return { ...DEFAULT_AGENT_POLICY };
  }
  return policyFrom(await open(POLICY_KIND, await readStored(AGENT_POLICY_STORAGE_KEY), key));
};

export const writeAgentPolicy = async (
  key: AgentPolicyKey,
  update: Partial<AgentPolicy>,
): Promise<AgentPolicy> => {
  if (update.maxSpendLimitUgnot !== undefined && !isValidMaxSpendLimit(update.maxSpendLimitUgnot)) {
    throw new Error('the maximum spend limit must be a positive integer amount of ugnot');
  }
  return withLock(POLICY_LOCK, async () => {
    const next = { ...(await readAgentPolicy(key)), ...update };
    const sealed = await seal(POLICY_KIND, { ...next }, key);
    await chrome.storage.local.set({ [AGENT_POLICY_STORAGE_KEY]: sealed });
    await chrome.storage.local.remove(AGENT_LEGACY_STORAGE_KEYS);
    return next;
  });
};

const MAX_TOKENS_PER_CONNECTION = 8;
const TOKEN_BYTES = 32;

// A token is valid only for the process it was issued to, as identified by the
// host from the OS (pid and start time). A token captured by another process,
// for example by taking over the socket path, does not work from there.
interface TokenGrant {
  hash: string;
  pid: number;
  start: string;
}

type Grants = Record<string, TokenGrant[]>;

export interface AgentProcess {
  pid: number;
  start: string;
}

const connectionKey = (accountId: string, siteName: string): string => `${accountId}|${siteName}`;

const hashToken = (token: string): string => toHex(sha256(new TextEncoder().encode(token)));

const isGrant = (value: unknown): value is TokenGrant =>
  isRecord(value)
  && typeof value.hash === 'string'
  && typeof value.pid === 'number'
  && typeof value.start === 'string';

const grantsFrom = (value: unknown): Grants => {
  if (!isRecord(value)) {
    return {};
  }
  const grants: Grants = {};
  for (const [key, list] of Object.entries(value)) {
    if (Array.isArray(list)) {
      grants[key] = list.filter(isGrant);
    }
  }
  return grants;
};

const matches = (
  grants: Grants,
  accountId: string,
  siteName: string,
  token: string | undefined,
  process: AgentProcess | undefined,
): boolean => {
  if (!token || !process) {
    return false;
  }
  const hash = hashToken(token);
  return (grants[connectionKey(accountId, siteName)] ?? []).some(
    grant => grant.hash === hash && grant.pid === process.pid && grant.start === process.start,
  );
};

const readVerifiedGrants = async (key: AgentPolicyKey): Promise<Grants> => {
  const payload = await open(GRANTS_KIND, await readStored(AGENT_CONNECTION_GRANTS_STORAGE_KEY), key);
  return grantsFrom(payload?.grants);
};

// The encrypted copy is authoritative; the plain index mirrors it so a locked
// wallet can still tell a connected process to unlock rather than reconnect.
const writeGrants = async (grants: Grants, key: AgentPolicyKey): Promise<void> => {
  const sealed = await seal(GRANTS_KIND, { grants }, key);
  await chrome.storage.local.set({
    [AGENT_CONNECTION_GRANTS_STORAGE_KEY]: sealed,
    [AGENT_CONNECTION_TOKENS_STORAGE_KEY]: grants,
  });
};

const removeAllGrants = async (): Promise<void> => {
  await chrome.storage.local.remove([
    AGENT_CONNECTION_GRANTS_STORAGE_KEY,
    AGENT_CONNECTION_TOKENS_STORAGE_KEY,
  ]);
};

// Grants are changed from the service worker (connect) and from wallet pages
// (disconnect); a Web Lock serializes those read-modify-write cycles across
// contexts so one cannot undo the other.
const GRANTS_LOCK = 'adena-agent-connection-grants';

export const createConnectionToken = (): string => toHex(Random.getBytes(TOKEN_BYTES));

// Reports whether token was issued for this account and agent to this very
// process, checked against the encrypted grants. Only hashes are stored.
export const hasConnectionToken = async (
  accountId: string,
  siteName: string,
  token: string | undefined,
  process: AgentProcess | undefined,
  key: AgentPolicyKey,
): Promise<boolean> => {
  if (!token || !process) {
    return false;
  }
  return matches(await readVerifiedGrants(key), accountId, siteName, token, process);
};

// The same check against the unencrypted index, for a locked wallet. It is a
// hint only: it may say a process should unlock, never that it may act.
export const hasUnverifiedConnectionToken = async (
  accountId: string,
  siteName: string,
  token: string | undefined,
  process: AgentProcess | undefined,
): Promise<boolean> =>
  matches(
    grantsFrom(await readStored(AGENT_CONNECTION_TOKENS_STORAGE_KEY)),
    accountId,
    siteName,
    token,
    process,
  );

// Records a token approved for process. reset drops tokens from an earlier
// connection, e.g. one the user removed under Connected Apps.
export const addConnectionToken = async (
  accountId: string,
  siteName: string,
  token: string,
  process: AgentProcess,
  reset: boolean,
  key: AgentPolicyKey,
): Promise<void> => {
  await withLock(GRANTS_LOCK, async () => {
    const grants = await readVerifiedGrants(key);
    const id = connectionKey(accountId, siteName);
    const previous = reset ? [] : (grants[id] ?? []);
    const next = [...previous, { hash: hashToken(token), pid: process.pid, start: process.start }];
    await writeGrants({ ...grants, [id]: next.slice(-MAX_TOKENS_PER_CONNECTION) }, key);
  });
};

// Drops connection grants when an agent's connection is removed: for one
// account and site, or every grant when no site is given. Without the
// password (key null, or none resolvable), every grant is dropped instead of
// leaving stale ones behind.
export const dropConnectionGrants = async (
  accountId?: string,
  siteName?: string,
  key?: AgentPolicyKey | null,
): Promise<void> => {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }
  const unlockKey
    = accountId === undefined || siteName === undefined
      ? null
      : key === undefined
        ? await resolveAgentPolicyKey()
        : key;
  await withLock(GRANTS_LOCK, async () => {
    if (accountId === undefined || siteName === undefined || !unlockKey) {
      await removeAllGrants();
      return;
    }
    const grants = await readVerifiedGrants(unlockKey);
    const id = connectionKey(accountId, siteName);
    const remaining = { ...grants };
    delete remaining[id];
    await writeGrants(remaining, unlockKey);
  });
};

// Re-encrypts the policy and grants for a new password. Data that does not
// decrypt under the old key is dropped, so a failed migration fails closed.
export const reencryptAgentStorage = async (
  previous: AgentPolicyKey | null,
  next: AgentPolicyKey,
): Promise<void> => {
  const stored = await chrome.storage.local.get([
    AGENT_POLICY_STORAGE_KEY,
    AGENT_CONNECTION_GRANTS_STORAGE_KEY,
  ]);
  const policy = previous
    ? await open(POLICY_KIND, stored?.[AGENT_POLICY_STORAGE_KEY], previous)
    : null;
  const grants = previous
    ? await open(GRANTS_KIND, stored?.[AGENT_CONNECTION_GRANTS_STORAGE_KEY], previous)
    : null;

  await withLock(POLICY_LOCK, async () => {
    if (policy) {
      const sealed = await seal(POLICY_KIND, { ...policyFrom(policy) }, next);
      await chrome.storage.local.set({ [AGENT_POLICY_STORAGE_KEY]: sealed });
    }
    else {
      await chrome.storage.local.remove(AGENT_POLICY_STORAGE_KEY);
    }
  });
  await withLock(GRANTS_LOCK, async () => {
    if (grants) {
      await writeGrants(grantsFrom(grants.grants), next);
    }
    else {
      await removeAllGrants();
    }
  });
};

// For a wallet reset: nothing of the previous wallet's agent setup survives.
export const clearAgentStorage = async (): Promise<void> => {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }
  await chrome.storage.local.remove([
    AGENT_POLICY_STORAGE_KEY,
    AGENT_CONNECTION_GRANTS_STORAGE_KEY,
    AGENT_CONNECTION_TOKENS_STORAGE_KEY,
    ...AGENT_LEGACY_STORAGE_KEYS,
  ]);
};
