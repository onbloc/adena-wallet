import { ChromeLocalStorage } from '@common/storage';
import { MessageHandler } from './inject/message';

function existsWallet(): Promise<boolean> {
  const storage = new ChromeLocalStorage();
  return storage
    .get('SERIALIZED')
    .then(async (serialized) => typeof serialized === 'string' && serialized.length !== 0)
    .catch(() => false);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('/register.html'),
    });
  } else if (details.reason === 'update') {
    existsWallet().then(() => {
      chrome.action.setPopup({ popup: '/popup.html' });
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  existsWallet()
    .then(async (exist) => {
      if (!exist) {
        await chrome.action.setPopup({ tabId: tab.id, popup: '/popup.html' });
        chrome.tabs.create({
          url: chrome.runtime.getURL('/register.html'),
        });
      } else {
        await chrome.action.setPopup({ tabId: tab.id, popup: '' });
      }
    })
    .catch(async () => {
      await chrome.action.setPopup({ tabId: tab.id, popup: '' });
      chrome.tabs.create({
        url: chrome.runtime.getURL('/register.html'),
      });
    });
});

chrome.runtime.onMessage.addListener(MessageHandler.createHandler);
