import { AlarmKey } from '@common/constants/alarm-key.constant';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { ChromeLocalStorage } from '@common/storage';
import { CommandHandler } from '@inject/message/command-handler';
import { CommandMessage, isCommandMessageData } from '@inject/message/command-message';
import { clearInMemoryKey } from '@inject/message/commands/encrypt';
import { MessageHandler } from './inject/message';

const inMemoryProvider = new MemoryProvider();
inMemoryProvider.init();

function existsWallet(): Promise<boolean> {
  const storage = new ChromeLocalStorage();
  return storage
    .get('SERIALIZED')
    .then(async (serialized) => typeof serialized === 'string' && serialized.length !== 0)
    .catch(() => false);
}

function setupPopup(existWallet: boolean): boolean {
  const popupUri = existWallet ? 'popup.html' : '';
  chrome.browserAction.setPopup({ popup: popupUri });
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

chrome.browserAction.onClicked.addListener(async () => {
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
  await chrome.alarms.clear(AlarmKey.EXPIRED_PASSWORD);
  inMemoryProvider.addConnection();

  port.onDisconnect.addListener(async () => {
    inMemoryProvider.removeConnection();
    if (inMemoryProvider.isActive()) {
      return;
    }

    inMemoryProvider.updateExpiredTime();

    await chrome.alarms.create(AlarmKey.EXPIRED_PASSWORD, {
      delayInMinutes: 5,
    });
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === AlarmKey.EXPIRED_PASSWORD) {
    await chrome.alarms.clear(AlarmKey.EXPIRED_PASSWORD);

    if (inMemoryProvider.isActive()) {
      return;
    }

    if (!inMemoryProvider.isExpired()) {
      return;
    }

    await chrome.storage.session.set({
      PASSWORD_EXPIRED_TIME: 0,
      ENCRYPTED_KEY: '',
      ENCRYPTED_PASSWORD: '',
    });
    await clearInMemoryKey(inMemoryProvider);
  }
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
