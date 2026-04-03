import { POPUP_SESSION_DATA_KEY } from '@common/constants/storage.constant';
import { POPUP_HEIGHT, POPUP_WIDTH } from '@common/constants/ui.constant';
import { ChromeSessionStorage } from '@common/storage/chrome-session-storage';

export const createPopupWindow = async (popupPath: string, state: object = {}): Promise<void> => {
  const popupOption: chrome.windows.CreateData = {
    url: chrome.runtime.getURL(`popup.html#${popupPath}`),
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
  };
  new ChromeSessionStorage().set(POPUP_SESSION_DATA_KEY, JSON.stringify(state)).then(() => {
    chrome.windows.create(popupOption, async (windowResponse) => {
      window?.close();
      chrome.tabs.onUpdated.addListener(() => {
        if (!windowResponse) {
          return;
        }
      });
    });
  });
};

export const isExtensionPopup = (): boolean => {
  const views = chrome.extension.getViews({ type: 'popup' });
  return views.length > 0 && views[0] === window;
};

export const isSeparatePopupWindow = (): boolean => {
  if (isExtensionPopup()) {
    return false;
  }

  return window.opener || chrome.extension.getViews({ type: 'popup' }).length === 0;
};
