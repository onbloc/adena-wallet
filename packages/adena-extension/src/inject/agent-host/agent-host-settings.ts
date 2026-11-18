import { Random, sha256, toHex } from 'adena-module';

import {
  AGENT_CONNECTION_TOKENS_STORAGE_KEY,
  AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT,
  AGENT_MASTER_REQUESTS_STORAGE_KEY,
  AGENT_MAX_SPEND_LIMIT_STORAGE_KEY,
} from './agent-host-protocol';

const UGNOT_INTEGER_PATTERN = /^[1-9][0-9]*$/;

export const isMasterRequestsAllowed = async (): Promise<boolean> => {
  const stored = await chrome.storage.local.get(AGENT_MASTER_REQUESTS_STORAGE_KEY);
  return stored?.[AGENT_MASTER_REQUESTS_STORAGE_KEY] === true;
};

export const setMasterRequestsAllowed = async (allowed: boolean): Promise<void> => {
  await chrome.storage.local.set({ [AGENT_MASTER_REQUESTS_STORAGE_KEY]: allowed });
};

export const isValidMaxSpendLimit = (ugnot: string): boolean => UGNOT_INTEGER_PATTERN.test(ugnot);

// Falls back to the default when the stored value is missing or malformed.
export const getMaxSpendLimitUgnot = async (): Promise<string> => {
  const stored = await chrome.storage.local.get(AGENT_MAX_SPEND_LIMIT_STORAGE_KEY);
  const value = stored?.[AGENT_MAX_SPEND_LIMIT_STORAGE_KEY];
  return typeof value === 'string' && isValidMaxSpendLimit(value)
    ? value
    : AGENT_DEFAULT_MAX_SPEND_LIMIT_UGNOT;
};

export const setMaxSpendLimitUgnot = async (ugnot: string): Promise<void> => {
  if (!isValidMaxSpendLimit(ugnot)) {
    throw new Error('the maximum spend limit must be a positive integer amount of ugnot');
  }
  await chrome.storage.local.set({ [AGENT_MAX_SPEND_LIMIT_STORAGE_KEY]: ugnot });
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

export interface AgentProcess {
  pid: number;
  start: string;
}

const connectionKey = (accountId: string, siteName: string): string => `${accountId}|${siteName}`;

const hashToken = (token: string): string => toHex(sha256(new TextEncoder().encode(token)));

const isGrant = (value: unknown): value is TokenGrant =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as TokenGrant).hash === 'string' &&
  typeof (value as TokenGrant).pid === 'number' &&
  typeof (value as TokenGrant).start === 'string';

const readGrants = async (): Promise<Record<string, unknown>> => {
  const stored = await chrome.storage.local.get(AGENT_CONNECTION_TOKENS_STORAGE_KEY);
  const value = stored?.[AGENT_CONNECTION_TOKENS_STORAGE_KEY];
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

const grantsOf = (grants: Record<string, unknown>, key: string): TokenGrant[] => {
  const list = grants[key];
  return Array.isArray(list) ? list.filter(isGrant) : [];
};

// Grants are changed from the service worker (connect) and from wallet pages
// (disconnect); a Web Lock serializes those read-modify-write cycles across
// contexts so one cannot undo the other.
const GRANTS_LOCK = 'adena-agent-connection-grants';

const withGrantsLock = async <T>(update: () => Promise<T>): Promise<T> => {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  return locks ? locks.request(GRANTS_LOCK, update) : update();
};

export const createConnectionToken = (): string => toHex(Random.getBytes(TOKEN_BYTES));

// Reports whether token was issued for this account and agent to this very
// process. Only hashes are stored, so the storage holds no usable token.
export const hasConnectionToken = async (
  accountId: string,
  siteName: string,
  token: string | undefined,
  process: AgentProcess | undefined,
): Promise<boolean> => {
  if (!token || !process) {
    return false;
  }
  const hash = hashToken(token);
  return grantsOf(await readGrants(), connectionKey(accountId, siteName)).some(
    (grant) => grant.hash === hash && grant.pid === process.pid && grant.start === process.start,
  );
};

// Records a token approved for process. reset drops tokens from an earlier
// connection, e.g. one the user removed under Connected Apps.
export const addConnectionToken = async (
  accountId: string,
  siteName: string,
  token: string,
  process: AgentProcess,
  reset: boolean,
): Promise<void> => {
  await withGrantsLock(async () => {
    const grants = await readGrants();
    const key = connectionKey(accountId, siteName);
    const previous = reset ? [] : grantsOf(grants, key);
    const next = [...previous, { hash: hashToken(token), pid: process.pid, start: process.start }];
    await chrome.storage.local.set({
      [AGENT_CONNECTION_TOKENS_STORAGE_KEY]: {
        ...grants,
        [key]: next.slice(-MAX_TOKENS_PER_CONNECTION),
      },
    });
  });
};

// Drops connection grants when an agent's connection is removed: for one
// account and site, or every grant when no site is given. A later approval of
// another process must not revive the grants of a disconnected one.
export const dropConnectionGrants = async (
  accountId?: string,
  siteName?: string,
): Promise<void> => {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }
  await withGrantsLock(async () => {
    if (accountId === undefined || siteName === undefined) {
      await chrome.storage.local.remove(AGENT_CONNECTION_TOKENS_STORAGE_KEY);
      return;
    }
    const grants = await readGrants();
    const key = connectionKey(accountId, siteName);
    if (!(key in grants)) {
      return;
    }
    const remaining = { ...grants };
    delete remaining[key];
    await chrome.storage.local.set({ [AGENT_CONNECTION_TOKENS_STORAGE_KEY]: remaining });
  });
};
