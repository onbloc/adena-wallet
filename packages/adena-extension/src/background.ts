import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { ChromeLocalStorage } from '@common/storage';
import { CommandHandler } from '@inject/message/command-handler';
import { isCommandMessageData } from '@inject/message/command-message';
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

chrome.runtime.onConnect.addListener((port) => {
  inMemoryProvider.addConnection();

  port.onDisconnect.addListener(() => {
    inMemoryProvider.removeConnection();
    chrome.alarms.clear('expired_password');

    if (!inMemoryProvider.isActive()) {
      chrome.alarms.clear('expired_password');
      chrome.alarms.create('expired_password', {
        delayInMinutes: inMemoryProvider.getExpiredPasswordDurationMinutes(),
      });
    }
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'expired_password') {
    await chrome.storage.session.clear();
    await clearInMemoryKey(inMemoryProvider);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isCommandMessageData(message)) {
    CommandHandler.createHandler(inMemoryProvider, message, sender, sendResponse);
    return true;
  }

  return MessageHandler.createHandler(message, sender, sendResponse);
});
