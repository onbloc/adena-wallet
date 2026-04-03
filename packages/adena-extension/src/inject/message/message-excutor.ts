export const createTransactionLoginPopup = (callback?: () => void): void => {
  const popupOption: chrome.windows.CreateData = {
    url: chrome.runtime.getURL('popup.html#/wallet/approve-transaction-login'),
    type: 'popup',
    height: 600,
    width: 360,
    left: 800,
    top: 300,
  };
  chrome.windows.create(popupOption, async (windowResponse) => {
    chrome.tabs.onUpdated.addListener((tabId, info) => {
      if (!windowResponse) {
        return;
      }
      if (info.status === 'complete' && windowResponse.tabs) {
        if (callback) {
          (): void => callback();
        }
      }
    });
  });
};
