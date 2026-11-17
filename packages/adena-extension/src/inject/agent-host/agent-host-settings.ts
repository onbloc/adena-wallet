import {
  AGENT_BINDINGS_STORAGE_KEY,
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

const bindingKey = (accountId: string, siteName: string): string => `${accountId}|${siteName}`;

const readBindings = async (): Promise<Record<string, string>> => {
  const stored = await chrome.storage.local.get(AGENT_BINDINGS_STORAGE_KEY);
  const value = stored?.[AGENT_BINDINGS_STORAGE_KEY];
  return value && typeof value === 'object' ? (value as Record<string, string>) : {};
};

// Returns the executable a connection was approved for, or undefined when the
// connection predates binding.
export const getAgentBinding = async (
  accountId: string,
  siteName: string,
): Promise<string | undefined> => {
  const bindings = await readBindings();
  const value = bindings[bindingKey(accountId, siteName)];
  return typeof value === 'string' ? value : undefined;
};

export const setAgentBinding = async (
  accountId: string,
  siteName: string,
  exe: string,
): Promise<void> => {
  const bindings = await readBindings();
  await chrome.storage.local.set({
    [AGENT_BINDINGS_STORAGE_KEY]: { ...bindings, [bindingKey(accountId, siteName)]: exe },
  });
};
