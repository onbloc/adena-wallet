import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { encodeParameter } from '@common/utils/client-utils';
import { InjectionMessage, InjectionMessageInstance } from './message';

/**
 * Shows the approval screen for a dApp request and reports the user's answer.
 *
 * The extension opens a popup window per request; the mobile app pushes a modal
 * screen instead and registers its own implementation with
 * `setApprovalPresenter`. Either way `sendResponse` must be called exactly once:
 * with the approval screen's reply, or with `closeMessage` when the user
 * dismisses it.
 */
export interface ApprovalPresenter {
  present(
    path: string,
    message: InjectionMessage,
    closeMessage: InjectionMessage,
    sendResponse: (response: any) => void,
  ): Promise<void>;
  hasOpenApprovals(): Promise<boolean>;
  /** Closes every open approval; their pending requests fail with UNEXPECTED_ERROR. */
  dismissAll(): Promise<void>;
}

// Tracks popup window ids that were closed programmatically (by the extension
// itself — removePopups, popupMessageListener cleanup, etc.) so that the
// onRemoved listener can distinguish "force-closed" from "user closed via X"
// and respond with UNEXPECTED_ERROR instead of a user-rejection message.
const programmaticallyClosedPopups = new Set<number>();

const createChromePopup = async (
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
    if (!windowResponse) {
      return;
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

    const onMessageListener = (popupMessage: InjectionMessage): void => {
      popupMessageListener(windowResponse.id, message, popupMessage, sendResponseOnce, cleanup);
    };

    const onTabsUpdatedListener = (tabId: number, info: chrome.tabs.TabChangeInfo): void => {
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

const existsChromePopups = async (): Promise<boolean> => {
  const windows = await chrome.windows.getAll();
  return windows.findIndex((window) => window.type === 'popup') > -1;
};

const removeChromePopups = async (): Promise<void> => {
  const windows = await chrome.windows.getAll();
  windows.forEach((window) => {
    if (window.type === 'popup' && window.id) {
      programmaticallyClosedPopups.add(window.id);
      chrome.windows.remove(window.id);
    }
  });
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

export const chromeApprovalPresenter: ApprovalPresenter = {
  present: createChromePopup,
  hasOpenApprovals: existsChromePopups,
  dismissAll: removeChromePopups,
};

let currentPresenter: ApprovalPresenter = chromeApprovalPresenter;

export function setApprovalPresenter(presenter: ApprovalPresenter): void {
  currentPresenter = presenter;
}

export function getApprovalPresenter(): ApprovalPresenter {
  return currentPresenter;
}
