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

const connectionKey = (accountId: string, siteName: string): string => `${accountId}|${siteName}`;

const hashToken = (token: string): string => toHex(sha256(new TextEncoder().encode(token)));

const readTokens = async (): Promise<Record<string, string[]>> => {
  const stored = await chrome.storage.local.get(AGENT_CONNECTION_TOKENS_STORAGE_KEY);
  const value = stored?.[AGENT_CONNECTION_TOKENS_STORAGE_KEY];
  return value && typeof value === 'object' ? (value as Record<string, string[]>) : {};
};

export const createConnectionToken = (): string => toHex(Random.getBytes(TOKEN_BYTES));

// Reports whether token was issued for this account and agent. Only hashes
// are stored, so the storage does not hold usable tokens.
export const hasConnectionToken = async (
  accountId: string,
  siteName: string,
  token: string | undefined,
): Promise<boolean> => {
  if (!token) {
    return false;
  }
  const hashes = (await readTokens())[connectionKey(accountId, siteName)];
  return Array.isArray(hashes) && hashes.includes(hashToken(token));
};

// Records a newly approved token. reset drops tokens from an earlier
// connection, e.g. one the user removed under Connected Apps.
export const addConnectionToken = async (
  accountId: string,
  siteName: string,
  token: string,
  reset: boolean,
): Promise<void> => {
  const tokens = await readTokens();
  const key = connectionKey(accountId, siteName);
  const previous = reset || !Array.isArray(tokens[key]) ? [] : tokens[key];
  const hashes = [...previous, hashToken(token)].slice(-MAX_TOKENS_PER_CONNECTION);
  await chrome.storage.local.set({
    [AGENT_CONNECTION_TOKENS_STORAGE_KEY]: { ...tokens, [key]: hashes },
  });
};
