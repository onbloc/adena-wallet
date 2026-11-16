import { AGENT_MASTER_REQUESTS_STORAGE_KEY } from './agent-host-protocol';

export const isMasterRequestsAllowed = async (): Promise<boolean> => {
  const stored = await chrome.storage.local.get(AGENT_MASTER_REQUESTS_STORAGE_KEY);
  return stored?.[AGENT_MASTER_REQUESTS_STORAGE_KEY] === true;
};

export const setMasterRequestsAllowed = async (allowed: boolean): Promise<void> => {
  await chrome.storage.local.set({ [AGENT_MASTER_REQUESTS_STORAGE_KEY]: allowed });
};
