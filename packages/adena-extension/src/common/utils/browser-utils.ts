import { POPUP_HEIGHT, POPUP_WIDTH } from '@common/constants/ui.constant';

export const createPopupWindow = async (popupPath: string, state: object = {}): Promise<void> => {
  const popupOption: chrome.windows.CreateData = {
    url: chrome.runtime.getURL(`popup.html#${popupPath}`),
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
  };
  chrome.storage.session.set({ state: state }).then(() => {
    window?.close();
    chrome.windows.create(popupOption, async (windowResponse) => {
      chrome.tabs.onUpdated.addListener(() => {
        if (!windowResponse) {
          return;
        }
      });
    });
  });
};
