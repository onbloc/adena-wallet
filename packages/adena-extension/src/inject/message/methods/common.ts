import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { encodeParameter, getSiteName } from '@common/utils/client-utils';
import { AGENT_REQUEST_PROTOCOL } from '@inject/agent-host/agent-host-protocol';

import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

// Tracks popup window ids that were closed programmatically (by the extension
// itself — removePopups, popupMessageListener cleanup, etc.) so that the
// onRemoved listener can distinguish "force-closed" from "user closed via X"
// and respond with UNEXPECTED_ERROR instead of a user-rejection message.
const programmaticallyClosedPopups = new Set<number>();

// Only Adena's own pages may answer an approval; a content script (or the
// page behind it) must not be able to resolve one. An agent approval must
// also come from the popup window it opened, since it can issue a token.
export const isPopupResponseSender = (
  sender: chrome.runtime.MessageSender | undefined,
  extensionOrigin: string,
  popupWindowId: number | undefined,
  requireSameWindow: boolean,
): boolean => {
  if (!sender || !(sender.url ?? '').startsWith(extensionOrigin)) {
    return false;
  }
  if (!requireSameWindow) {
    return true;
  }
  return popupWindowId !== undefined && sender.tab?.windowId === popupWindowId;
};

export const createPopup = async (
  popupPath: string,
  message: InjectionMessage,
  closeMessage: InjectionMessage,
  sendResponse: (response: any) => void,
  onWindowCreated?: (windowId: number) => void,
): Promise<void> => {
  const popupOption: chrome.windows.CreateData = {
    url: chrome.runtime.getURL(
      `popup.html#${popupPath}`
      + `?key=${message.key}`
      + `&hostname=${message.hostname}`
      + `&protocol=${message.protocol}`
      + `&data=${encodeParameter(message)}`,
    ),
    type: 'popup',
    height: 590,
    width: 380,
    left: 800,
    top: 300,
  };

  chrome.windows.create(popupOption, async (windowResponse) => {
    if (!windowResponse) {
      // Settle the request; otherwise its caller waits forever.
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {},
          message.key,
        ),
      );
      return;
    }
    if (windowResponse.id !== undefined) {
      onWindowCreated?.(windowResponse.id);
    }

    // Guard: ensure sendResponse fires at most once. Without this, a successful
    // popup response and the subsequent window removal both try to reply to the
    // dapp, and whichever the background dispatches first wins — producing a
    // TRANSACTION_REJECTED even though the popup returned success.
    let responseSent = false;
    const sendResponseOnce = (msg: any): void => {
      if (responseSent) return;
      responseSent = true;
      sendResponse(msg);
    };

    const cleanup = (): void => {
      chrome.windows.onRemoved.removeListener(onRemovedListener);
      chrome.runtime.onMessage.removeListener(onMessageListener);
      chrome.tabs.onUpdated.removeListener(onTabsUpdatedListener);
    };

    const onRemovedListener = (removeWindowId: number): void => {
      if (windowResponse.id !== removeWindowId) return;
      const wasProgrammatic = programmaticallyClosedPopups.has(removeWindowId);
      if (wasProgrammatic) {
        programmaticallyClosedPopups.delete(removeWindowId);
      }
      // If the popup was force-closed by the extension itself, the dapp should
      // not be told "user rejected" — surface an unexpected error instead.
      const responseMsg = wasProgrammatic
        ? InjectionMessageInstance.failure(
            WalletResponseFailureType.UNEXPECTED_ERROR,
            {},
            message.key,
          )
        : closeMessage;
      sendResponseOnce(responseMsg);
      cleanup();
    };

    const onMessageListener = (
      popupMessage: InjectionMessage,
      sender: chrome.runtime.MessageSender,
    ): void => {
      if (
        !isPopupResponseSender(
          sender,
          chrome.runtime.getURL(''),
          windowResponse.id,
          message.protocol === AGENT_REQUEST_PROTOCOL,
        )
      ) {
        return;
      }
      popupMessageListener(windowResponse.id, message, popupMessage, sendResponseOnce, cleanup);
    };

    const onTabsUpdatedListener = (tabId: number, info: chrome.tabs.OnUpdatedInfo): void => {
      if (info.status === 'complete' && windowResponse.tabs) {
        chrome.runtime.onMessage.removeListener(onMessageListener);
        chrome.runtime.onMessage.addListener(onMessageListener);

        chrome.tabs
          .sendMessage(tabId, {
            type: message.type,
            data: message,
            called: tabId,
          })
          .catch(() => undefined);
      }
    };

    chrome.windows.onRemoved.addListener(onRemovedListener);
    chrome.tabs.onUpdated.addListener(onTabsUpdatedListener);
  });
};

export const existsPopups = async (): Promise<boolean> => {
  const windows = await chrome.windows.getAll();
  return windows.findIndex(window => window.type === 'popup') > -1;
};

export const removePopups = async (): Promise<void> => {
  const windows = await chrome.windows.getAll();
  windows.forEach((window) => {
    if (window.type === 'popup' && window.id) {
      programmaticallyClosedPopups.add(window.id);
      chrome.windows.remove(window.id);
    }
  });
};

export const checkEstablished = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<boolean> => {
  const accountId = await core.getCurrentAccountId();

  const siteName = getSiteName(requestData.protocol, requestData.hostname);
  const isEstablished = await core.establishService.isEstablishedBy(accountId, siteName);
  if (!isEstablished) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.NOT_CONNECTED,
        {},
        requestData.key,
      ),
    );
    return false;
  }
  return true;
};

const popupMessageListener = (
  popupId: number | undefined,
  requestData: InjectionMessage,
  popupMessage: InjectionMessage,
  sendResponseOnce: (message: any) => void,
  cleanup: () => void,
): boolean => {
  if (requestData.key !== popupMessage.key) return true;

  // Reply to the dapp first, then clean up listeners so the subsequent window
  // removal cannot fire another sendResponse after the success path.
  sendResponseOnce(popupMessage);
  cleanup();
  if (popupId) {
    chrome.windows.remove(popupId).catch(() => undefined);
  }
  return true;
};
