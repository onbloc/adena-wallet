import { AdenaStorage } from '@common/storage';
import { encodeParameter } from '@common/utils/client-utils';
import { ChainRepository } from '@repositories/common';
import { WalletAccountRepository, WalletEstablishRepository } from '@repositories/wallet';
import { ChainService, WalletEstablishService } from '@services/index';
import axios from 'axios';
import { InjectionMessage, InjectionMessageInstance } from '../message';

export const createPopup = async (
  popupPath: string,
  message: InjectionMessage,
  closeMessage: InjectionMessage,
  sendResponse: (response: any) => void,
) => {
  const popupOption: chrome.windows.CreateData = {
    url: chrome.runtime.getURL(
      `popup.html#${popupPath}?key=${message.key}&hostname=${message.hostname}&data=${encodeParameter(message)}`,
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
  const localStorage = AdenaStorage.local();
  const axiosInstance = axios.create();
  const accountRepository = new WalletAccountRepository(localStorage);
  const establishRepository = new WalletEstablishRepository(localStorage);
  const chainRepository = new ChainRepository(localStorage, axiosInstance);
  const chainService = new ChainService(chainRepository);
  const establishService = new WalletEstablishService(establishRepository, chainService);
  const address = await accountRepository.getCurrentAccountAddress();
  const isEstablished = await establishService.isEstablished(requestData.hostname ?? '', address);
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
