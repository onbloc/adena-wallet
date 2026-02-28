import { AlarmKey, SCHEDULE_ALARMS } from '@common/constants/alarm-key.constant';
import { ADENA_WALLET_EXTENSION_ID } from '@common/constants/storage.constant';
import { TransactionEventStore } from '@common/event-store';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { ChromeLocalStorage } from '@common/storage';
import { CommandHandler } from '@inject/message/command-handler';
import {
  CommandMessage,
  CommandMessageData,
  isCommandMessageData,
} from '@inject/message/command-message';
import { clearInMemoryKey } from '@inject/message/commands/encrypt';
import {
  GnoSessionState,
  GnoSessionUpdateMessage,
  PopupSessionUpdateMessage,
} from '@inject/message/methods/gno-session';
import {
  addTransactionEvent,
  isTransactionNotification,
  parseTransactionScannerUrl,
} from '@inject/message/methods/transaction-event';
import { InjectionMessage, MessageHandler } from './inject/message';

const inMemoryProvider = new MemoryProvider();
inMemoryProvider.init();

const transactionEventStore = new TransactionEventStore();

let transactionEventInterval: NodeJS.Timeout | undefined = undefined;

// Gno Session Management

// Maps sessionId to session state
const gnoSessions = new Map<string, GnoSessionState>();
// Maps funcKey (pkgPath:funcName) to sessionId for lookup by function
const funcKeyToSessionId = new Map<string, string>();
// Maps sessionId to popup windowId (if popup is open for this session)
const sessionPopupMap = new Map<string, number>();
// Maps popup windowId to sessionId for reverse lookup
const popupSessionMap = new Map<number, string>();

function makeFuncKey(pkgPath: string, funcName: string): string {
  return `${pkgPath}:${funcName}`;
}

/**
 * Cleans up all data related to a session.
 * This includes removing from gnoSessions, funcKeyToSessionId, and popup mappings.
 */
function cleanupSession(sessionId: string): void {
  const session = gnoSessions.get(sessionId);
  if (!session) return;

  // Remove from gnoSessions
  gnoSessions.delete(sessionId);

  // Remove from funcKeyToSessionId if this session is the current one for the funcKey
  const funcKey = makeFuncKey(session.pkgPath, session.funcName);
  if (funcKeyToSessionId.get(funcKey) === sessionId) {
    funcKeyToSessionId.delete(funcKey);
  }

  // Remove popup mappings
  const popupId = sessionPopupMap.get(sessionId);
  if (popupId) {
    sessionPopupMap.delete(sessionId);
    popupSessionMap.delete(popupId);
  }
}

function isGnoSessionUpdateMessage(message: unknown): message is GnoSessionUpdateMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as GnoSessionUpdateMessage).type === 'GNO_SESSION_UPDATE'
  );
}

interface RegisterPopupSessionMessage {
  type: 'REGISTER_POPUP_SESSION';
  sessionId: string;
}

function isRegisterPopupSessionMessage(message: unknown): message is RegisterPopupSessionMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as RegisterPopupSessionMessage).type === 'REGISTER_POPUP_SESSION'
  );
}

interface GetGnoSessionMessage {
  type: 'GET_GNO_SESSION';
  sessionId: string;
}

interface GetActiveSessionMessage {
  type: 'GET_ACTIVE_SESSION';
  funcName: string;
  pkgPath: string;
}

interface GetAllGnoSessionsMessage {
  type: 'GET_ALL_GNO_SESSIONS';
}

function isGetGnoSessionMessage(message: unknown): message is GetGnoSessionMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as GetGnoSessionMessage).type === 'GET_GNO_SESSION'
  );
}

function isGetActiveSessionMessage(message: unknown): message is GetActiveSessionMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as GetActiveSessionMessage).type === 'GET_ACTIVE_SESSION'
  );
}

function isGetAllGnoSessionsMessage(message: unknown): message is GetAllGnoSessionsMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as GetAllGnoSessionsMessage).type === 'GET_ALL_GNO_SESSIONS'
  );
}

async function handleRegisterPopupSession(
  message: RegisterPopupSessionMessage,
  sender: chrome.runtime.MessageSender,
): Promise<{ success: boolean; session?: GnoSessionState }> {
  const { sessionId } = message;

  // Get popup window ID
  let popupId: number | undefined;

  if (sender.tab?.windowId) {
    popupId = sender.tab.windowId;
  } else {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      if (currentWindow.type === 'popup') {
        popupId = currentWindow.id;
      }
    } catch {
      // Ignore
    }
  }

  if (popupId) {
    sessionPopupMap.set(sessionId, popupId);
    popupSessionMap.set(popupId, sessionId);
  }

  const session = gnoSessions.get(sessionId);

  return {
    success: true,
    session,
  };
}

function handleGnoSessionUpdate(
  message: GnoSessionUpdateMessage,
  sender: chrome.runtime.MessageSender,
): void {
  const { data } = message;
  const { sessionId, funcName, pkgPath, chainId, rpc, updateType } = data;
  const funcKey = makeFuncKey(pkgPath, funcName);

  // Get or create session state
  let session = gnoSessions.get(sessionId);

  if (!session) {
    // Clean up old session for this function if exists
    const oldSessionId = funcKeyToSessionId.get(funcKey);
    if (oldSessionId && oldSessionId !== sessionId) {
      cleanupSession(oldSessionId);
    }

    session = {
      sessionId,
      funcName,
      pkgPath,
      chainId,
      rpc,
      address: '',
      mode: 'secure',
      params: {},
      tabId: sender.tab?.id || 0,
    };
    gnoSessions.set(sessionId, session);
    funcKeyToSessionId.set(funcKey, sessionId);
  }

  // Update session based on update type
  switch (updateType) {
    case 'init':
    case 'params':
      if (data.allParams) {
        session.params = data.allParams;
      }
      break;
    case 'mode':
      if (data.mode) {
        session.mode = data.mode;
      }
      break;
    case 'address':
      if (data.address !== undefined) {
        session.address = data.address;
      }
      break;
  }

  // Forward update to popup - broadcast to all extension contexts
  const popupMessage: PopupSessionUpdateMessage = {
    type: 'POPUP_SESSION_UPDATE',
    sessionId,
    updateType,
    data,
  };

  // Broadcast to all extension pages (including popup)
  chrome.runtime.sendMessage(popupMessage).catch(() => {
    // No receivers - popup might not be open, this is normal
  });
}

// Session handler
function handleGetGnoSession(message: GetGnoSessionMessage): GnoSessionState | null {
  const session = gnoSessions.get(message.sessionId);
  console.log('[Background] GET_GNO_SESSION:', message.sessionId, session ? 'found' : 'not found');
  return session || null;
}

function handleGetActiveSession(message: GetActiveSessionMessage): GnoSessionState | null {
  const funcKey = makeFuncKey(message.pkgPath, message.funcName);
  const sessionId = funcKeyToSessionId.get(funcKey);
  const session = sessionId ? gnoSessions.get(sessionId) : null;

  console.log('[Background] GET_ACTIVE_SESSION:', {
    funcKey,
    sessionId,
    found: !!session,
  });

  return session || null;
}

function handleGetAllGnoSessions(): Array<{ id: string; data: GnoSessionState }> {
  const allSessions = Array.from(gnoSessions.entries()).map(([id, data]) => ({
    id,
    data,
  }));

  return allSessions;
}

// Clean up sessions when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  // Collect session IDs to clean up (avoid modifying map during iteration)
  const sessionsToCleanup: string[] = [];

  gnoSessions.forEach((session, sessionId) => {
    if (session.tabId === tabId) {
      sessionsToCleanup.push(sessionId);
    }
  });

  sessionsToCleanup.forEach(cleanupSession);
});

// Clean up popup mapping when popup window is closed
chrome.windows.onRemoved.addListener((windowId) => {
  const sessionId = popupSessionMap.get(windowId);
  if (sessionId) {
    popupSessionMap.delete(windowId);
    sessionPopupMap.delete(sessionId);
  }
});

initAlarms();

function existsWallet(): Promise<boolean> {
  const storage = new ChromeLocalStorage();
  return storage
    .get('SERIALIZED')
    .then(async (serialized) => typeof serialized === 'string' && serialized.length !== 0)
    .catch(() => false);
}

function setupPopup(existWallet: boolean): boolean {
  const popupUri = existWallet ? 'popup.html' : '';
  chrome.action.setPopup({ popup: popupUri });
  return true;
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('/register.html'),
    });
  } else if (details.reason === 'update') {
    existsWallet().then((existWallet) => {
      setupPopup(existWallet);
    });
  }
});

chrome.tabs.onCreated.addListener(() => {
  existsWallet().then((existWallet) => {
    setupPopup(existWallet);
  });
});

chrome.action.onClicked.addListener(async () => {
  existsWallet().then((existWallet) => {
    setupPopup(existWallet);
    if (!existWallet) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('/register.html'),
      });
    }
  });
});

chrome.runtime.onConnect.addListener(async (port) => {
  if (port.name !== ADENA_WALLET_EXTENSION_ID) {
    return;
  }

  inMemoryProvider.addConnection();
  inMemoryProvider.updateExpiredTimeBy(null);

  port.onDisconnect.addListener(async () => {
    inMemoryProvider.removeConnection();

    if (!inMemoryProvider.isActive()) {
      const expiredTime = new Date().getTime() + inMemoryProvider.getExpiredPasswordDurationTime();
      inMemoryProvider.updateExpiredTimeBy(expiredTime);

      console.info('Password Expired time:', new Date(expiredTime));
    }
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    const currentTime = new Date().getTime();
    chrome.storage.local.set({ SESSION: currentTime });

    switch (alarm?.name) {
      case AlarmKey.EXPIRED_PASSWORD:
        if (!inMemoryProvider.isExpired(currentTime)) {
          return;
        }

        await chrome.storage.session.clear();
        await clearInMemoryKey(inMemoryProvider);

        inMemoryProvider.updateExpiredTimeBy(null);
        console.info('Password Expired');
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(error);
  }

  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    try {
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (
        !tab?.url ||
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:')
      ) {
        return;
      }

      chrome.tabs
        .sendMessage(
          tabId,
          CommandMessage.command('checkMetadata', {
            gnoMessageInfo: null,
            gnoConnectInfo: null,
          }),
        )
        .catch(() => undefined);
    } catch {
      // Tab may have been closed
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle ping from content script for connection check
  if (message?.type === 'ping') {
    sendResponse({ status: 'pong' });
    return true;
  }

  // Handle Gno session updates from content script
  if (isGnoSessionUpdateMessage(message)) {
    handleGnoSessionUpdate(message, sender);
    sendResponse({ success: true });
    return true;
  }

  // Handle popup session registration
  if (isRegisterPopupSessionMessage(message)) {
    handleRegisterPopupSession(message, sender).then(sendResponse).catch(console.warn);
    return true;
  }

  // Handle session queries
  if (isGetGnoSessionMessage(message)) {
    const session = handleGetGnoSession(message);
    sendResponse(session);
    return true;
  }

  if (isGetActiveSessionMessage(message)) {
    const session = handleGetActiveSession(message);
    sendResponse(session);
    return true;
  }

  if (isGetAllGnoSessionsMessage(message)) {
    const sessions = handleGetAllGnoSessions();
    sendResponse(sessions);
    return true;
  }

  if (isCommandMessageData(message)) {
    CommandHandler.createHandler(inMemoryProvider, message, sender, sendResponse);
    return true;
  }

  return MessageHandler.createHandler(inMemoryProvider, message, sender, (response) =>
    sendResponseWithNotification(response, message, sendResponse),
  );
});

/** When the notification is clicked, the tab is opened and the notification is cleared. */
chrome.notifications.onClicked.addListener((notificationId) => {
  if (isTransactionNotification(notificationId)) {
    const scannerUrl = parseTransactionScannerUrl(notificationId);
    if (scannerUrl) {
      chrome.tabs.create({ url: scannerUrl });
    }

    chrome.notifications.clear(notificationId);
  }
});

function initAlarms(): void {
  SCHEDULE_ALARMS.map(initAlarmWithDelay);
}

function initAlarmWithDelay(alarm: { key: string; periodInMinutes: number; delay: number }): void {
  if (alarm.delay === 0) {
    chrome.alarms.create(alarm.key, {
      periodInMinutes: alarm.periodInMinutes,
    });
    return;
  }

  setTimeout(
    () =>
      chrome.alarms.create(alarm.key, {
        periodInMinutes: alarm.periodInMinutes,
      }),
    alarm.delay,
  );
}

/**
 * Send response with notification and transaction event.
 *
 * @param response - Response to send.
 * @param message - Message to send.
 * @param sendResponse - Send response function.
 */
async function sendResponseWithNotification(
  response: InjectionMessage | CommandMessageData | any,
  message: any,
  sendResponse: (response?: any) => void,
): Promise<void> {
  sendResponse(response);

  const addedEvents = await addTransactionEvent(inMemoryProvider, transactionEventStore, message);

  if (transactionEventStore.count() > 0 || addedEvents) {
    if (transactionEventInterval) {
      clearInterval(transactionEventInterval);
      transactionEventInterval = undefined;
    }

    transactionEventInterval = setInterval(async () => {
      await transactionEventStore.updatePendingEvents();
      await transactionEventStore.emitAllEvents();

      if (transactionEventStore.count() === 0 && transactionEventInterval) {
        clearInterval(transactionEventInterval);
        transactionEventInterval = undefined;
      }
    }, 1000);
  }
}
