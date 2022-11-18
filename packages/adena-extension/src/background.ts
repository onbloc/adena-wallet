import { MessageHandler } from './inject/message';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('/install.html'),
    });
  } else if (details.reason === 'update') {
    console.log('update');
  }
});

chrome.runtime.onMessage.addListener(MessageHandler.createHandler);
