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
  addTransactionEvent,
  isTransactionNotification,
  parseTransactionScannerUrl,
} from '@inject/message/methods/transaction-event';
import { InjectionMessage, MessageHandler } from './inject/message';

const inMemoryProvider = new MemoryProvider();
inMemoryProvider.init();

const transactionEventStore = new TransactionEventStore();

let transactionEventInterval: NodeJS.Timeout | undefined = undefined;

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
      chrome.tabs
        .sendMessage(
          tabId,
          CommandMessage.command('checkMetadata', {
            gnoMessageInfo: null,
            gnoConnectInfo: null,
          }),
        )
        .catch(console.info);
    } catch (e) {
      console.warn('Failed to send message(checkMetadata)', e);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
