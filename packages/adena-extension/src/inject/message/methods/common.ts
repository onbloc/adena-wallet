import { encodeParameter, getSiteName } from '@common/utils/client-utils';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

export const createPopup = async (
  popupPath: string,
  message: InjectionMessage,
  closeMessage: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  const popupOption: chrome.windows.CreateData = {
    url: chrome.runtime.getURL(
      `popup.html#${popupPath}` +
        `?key=${message.key}` +
        `&hostname=${message.hostname}` +
        `&protocol=${message.protocol}` +
        `&data=${encodeParameter(message)}`,
    ),
    type: 'popup',
    height: 590,
    width: 380,
    left: 800,
    top: 300,
  };

  chrome.windows.create(popupOption, async (windowResponse) => {
    chrome.tabs.onUpdated.addListener((tabId, info) => {
      if (!windowResponse) {
        return;
      }
      chrome.windows.onRemoved.addListener((removeWindowId) => {
        if (windowResponse.id === removeWindowId) {
          sendResponse(closeMessage);
        }
      });
      if (info.status === 'complete' && windowResponse.tabs) {
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
                popupMessageListener(windowResponse.id, message, popupMessage, sendResponse),
              );
              popupMessageListener(windowResponse.id, message, popupMessage, sendResponse);
            });
          },
        );
      }
    });
  });
};

export const existsPopups = async (): Promise<boolean> => {
  const windows = await chrome.windows.getAll();
  return windows.findIndex((window) => window.type === 'popup') > -1;
};

export const removePopups = async (): Promise<void> => {
  const windows = await chrome.windows.getAll();
  windows.forEach((window) => {
    if (window.type === 'popup' && window.id) {
      chrome.windows.remove(window.id);
    }
  });
};

export const checkEstablished = async (
  requestData: InjectionMessage,
  sendResponse: (response: any) => void,
  sendSuccessResponse = false,
): Promise<boolean> => {
  const core = new InjectCore();
  const accountId = await core.getCurrentAccountId();
  const isLocked = await core.walletService.isLocked();
  const siteName = getSiteName(requestData.protocol, requestData.hostname);

  if (isLocked) {
    sendResponse(InjectionMessageInstance.failure('WALLET_LOCKED', {}, requestData.key))
    return false
  }

  const isEstablished = await core.establishService.isEstablishedBy(accountId, siteName);
  if (!isEstablished) {
    sendResponse(InjectionMessageInstance.failure('NOT_CONNECTED', {}, requestData.key));
    return false;
  }
  if (sendSuccessResponse) {
    sendResponse(InjectionMessageInstance.success('ALREADY_CONNECTED', {}, requestData.key))
  }
  return true;
};

const popupMessageListener = (
  popupId: number | undefined,
  requestData: InjectionMessage,
  popupMessage: InjectionMessage,
  sendResponse: (message: any) => void,
): boolean => {
  new Promise((resolve) => {
    if (requestData.key === popupMessage.key) {
      resolve(popupMessage);
    }
  })
    .then(sendResponse)
    .finally(() => popupId && chrome.windows.remove(popupId));
  return true;
};
