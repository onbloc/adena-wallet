import { MemoryProvider } from '@common/provider/memory/memory-provider';

import { cancelAllAgentApprovals, handleAgentHostMessage } from './agent-host-handler';
import {
  AGENT_HOST_BUSY_EVENT,
  AGENT_HOST_ENABLED_STORAGE_KEY,
  AGENT_HOST_NAME,
  AGENT_HOST_RELOAD_REQUIRED,
  AGENT_HOST_STATUS_STORAGE_KEY,
  AgentHostStatus,
} from './agent-host-protocol';
import { dropConnectionGrants } from './agent-host-settings';

const NATIVE_MESSAGING_PERMISSION: chrome.permissions.Permissions = {
  permissions: ['nativeMessaging'],
};

let port: chrome.runtime.Port | null = null;

// A host that found another browser serving agents says so once, then exits.
export const hostBusyStatusOf = (
  message: unknown,
): Omit<AgentHostStatus, 'updatedAt'> | null => {
  const event = message as { event?: unknown; browser?: unknown } | null;
  if (typeof event !== 'object' || event === null || event.event !== AGENT_HOST_BUSY_EVENT) {
    return null;
  }
  const browser = typeof event.browser === 'string' ? event.browser.slice(0, 64) : '';
  return { connected: false, error: AGENT_HOST_BUSY_EVENT, ...(browser ? { browser } : {}) };
};

const writeStatus = async (status: Omit<AgentHostStatus, 'updatedAt'>): Promise<void> => {
  await chrome.storage.session
    .set({ [AGENT_HOST_STATUS_STORAGE_KEY]: { ...status, updatedAt: Date.now() } })
    .catch(() => undefined);
};

export const isAgentHostEnabled = async (): Promise<boolean> => {
  const stored = await chrome.storage.local.get(AGENT_HOST_ENABLED_STORAGE_KEY);
  return stored?.[AGENT_HOST_ENABLED_STORAGE_KEY] === true;
};

export const hasNativeMessagingPermission = async (): Promise<boolean> => {
  if (!chrome.permissions?.contains) {
    return false;
  }
  return chrome.permissions.contains(NATIVE_MESSAGING_PERMISSION).catch(() => false);
};

const disconnect = (): void => {
  if (!port) {
    return;
  }
  const current = port;
  port = null;
  cancelAllAgentApprovals();
  current.disconnect();
};

const connect = (inMemoryProvider: MemoryProvider): void => {
  if (port) {
    return;
  }

  // A worker started before the optional permission was granted does not
  // gain connectNative; only a restarted extension does.
  if (typeof chrome.runtime.connectNative !== 'function') {
    writeStatus({ connected: false, error: AGENT_HOST_RELOAD_REQUIRED });
    return;
  }

  let connected: chrome.runtime.Port;
  try {
    connected = chrome.runtime.connectNative(AGENT_HOST_NAME);
  }
  catch (error) {
    writeStatus({
      connected: false,
      error: error instanceof Error ? error.message : 'failed to connect agent host',
    });
    return;
  }
  port = connected;
  let busy: Omit<AgentHostStatus, 'updatedAt'> | null = null;

  connected.onMessage.addListener((message: unknown) => {
    const busyStatus = hostBusyStatusOf(message);
    if (busyStatus) {
      busy = busyStatus;
      writeStatus(busyStatus);
      return;
    }
    handleAgentHostMessage(inMemoryProvider, message).then((response) => {
      if (response && port === connected) {
        connected.postMessage(response);
      }
    });
  });

  connected.onDisconnect.addListener(() => {
    // Reading lastError marks it handled; it explains why the host went away
    // (for example, the host manifest is not installed).
    const reason = chrome.runtime.lastError?.message;
    if (port === connected) {
      port = null;
      cancelAllAgentApprovals();
    }
    // The exit that follows host_busy must not hide why the host left.
    writeStatus(busy ?? { connected: false, error: reason });
  });

  writeStatus({ connected: true });
};

export const syncAgentHostConnection = async (inMemoryProvider: MemoryProvider): Promise<void> => {
  const [enabled, permitted] = await Promise.all([
    isAgentHostEnabled().catch(() => false),
    hasNativeMessagingPermission(),
  ]);

  if (enabled && permitted) {
    connect(inMemoryProvider);
    return;
  }

  disconnect();
  await writeStatus({ connected: false });
};

export const initAgentHostBridge = (inMemoryProvider: MemoryProvider): void => {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && AGENT_HOST_ENABLED_STORAGE_KEY in changes) {
      syncAgentHostConnection(inMemoryProvider);
    }
  });
  // Losing the permission revokes agents like turning the connection off.
  chrome.permissions?.onRemoved?.addListener((removed) => {
    if (removed.permissions?.includes('nativeMessaging')) {
      dropConnectionGrants().catch(error =>
        console.warn('could not revoke agent connections', error),
      );
    }
    syncAgentHostConnection(inMemoryProvider);
  });

  syncAgentHostConnection(inMemoryProvider);
};
