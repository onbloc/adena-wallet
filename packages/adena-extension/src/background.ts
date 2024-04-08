import { ChromeLocalStorage } from '@common/storage';
import { MessageHandler } from './inject/message';

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

chrome.runtime.onMessage.addListener(MessageHandler.createHandler);
