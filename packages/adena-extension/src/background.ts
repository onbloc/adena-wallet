import { AlarmKey, SCHEDULE_ALARMS } from '@common/constants/alarm-key.constant';
import { ADENA_WALLET_EXTENSION_ID } from '@common/constants/storage.constant';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { ChromeLocalStorage } from '@common/storage';
import { CommandHandler } from '@inject/message/command-handler';
import { CommandMessage, isCommandMessageData } from '@inject/message/command-message';
import { clearInMemoryKey } from '@inject/message/commands/encrypt';
import { MessageHandler } from './inject/message';

const inMemoryProvider = new MemoryProvider();
inMemoryProvider.init();

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

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Check metadata when tab is updated
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, CommandMessage.command('checkMetadata'));
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isCommandMessageData(message)) {
    CommandHandler.createHandler(inMemoryProvider, message, sender, sendResponse);
    return true;
  }

  return MessageHandler.createHandler(inMemoryProvider, message, sender, sendResponse);
});

function initAlarms(): void {
  SCHEDULE_ALARMS.map((alarm) => {
    chrome.alarms.create(alarm.key, {
      periodInMinutes: alarm.periodInMinutes,
    });
  });
}
