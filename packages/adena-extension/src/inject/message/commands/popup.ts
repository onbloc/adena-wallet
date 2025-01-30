export const clearPopup = async (): Promise<void> => {
  const windows = await chrome.windows.getAll();
  windows.forEach((window) => {
    if (window.type === 'popup' && window.id) {
      if (window.focused) {
        return;
      }

      chrome.windows.remove(window.id);
      return;
    }
  });

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url?.includes(chrome.runtime.id)) {
        if (!tab.id) {
          return;
        }

        chrome.tabs.remove(tab.id);
      }
    });
  });
};
