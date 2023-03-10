import { encodeParameter, getSiteName } from '@common/utils/client-utils';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

export const createPopup = async (
  popupPath: string,
  message: InjectionMessage,
  closeMessage: InjectionMessage,
  sendResponse: (response: any) => void,
) => {
  const popupOption: chrome.windows.CreateData = {
    url: chrome.runtime.getURL(
      `popup.html#${popupPath}?key=${message.key}&url=${message.url}&hostname=${message.hostname}&data=${encodeParameter(message)}`,
    ),
    type: 'popup',
    height: 590,
    width: 380,
    left: 800,
    top: 300,
  };

  chrome.windows.create(popupOption, async (windowResposne) => {
    chrome.tabs.onUpdated.addListener((tabId, info) => {
      if (!windowResposne) {
        return;
      }
      chrome.windows.onRemoved.addListener((removeWindowId) => {
        if (windowResposne.id === removeWindowId) {
          sendResponse(closeMessage);
        }
      });
      if (info.status === 'complete' && windowResposne.tabs) {
        chrome.tabs.sendMessage(
          tabId,
          {
            type: message.type,
            data: message,
            called: tabId,
          },
          async () => {
            chrome.runtime.onMessage.addListener((popupMessage) => {
              chrome.runtime.onMessage.removeListener((popupMessage) =>
                popupMessageListener(windowResposne.id, message, popupMessage, sendResponse),
              );
              popupMessageListener(windowResposne.id, message, popupMessage, sendResponse);
            });
          },
        );
      }
    });
  });
};

export const existsPopups = async () => {
  const windows = await chrome.windows.getAll();
  return windows.findIndex((window) => window.type === 'popup') > -1;
};

export const checkEstablished = async (
  requestData: InjectionMessage,
  sendResponse: (response: any) => void,
) => {
  const core = new InjectCore();

  const address = await core.accountService.getCurrentAccountAddress();
  const siteName = getSiteName(requestData.hostname);
  const isEstablished = await core.establishService.isEstablished(siteName, address);
  if (!isEstablished) {
    sendResponse(InjectionMessageInstance.failure('NOT_CONNECTED', requestData, requestData.key));
    return false;
  }
  return true;
};

const popupMessageListener = (
  popupId: number | undefined,
  requestData: InjectionMessage,
  popupMessage: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  new Promise((resolve) => {
    if (requestData.key === popupMessage.key) {
      resolve(popupMessage);
    }
  })
    .then(sendResponse)
    .finally(() => popupId && chrome.windows.remove(popupId));
  return true;
};
