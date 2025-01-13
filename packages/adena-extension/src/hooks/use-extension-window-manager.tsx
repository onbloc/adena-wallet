import React from 'react';

const useExtensionWindowManager = () => {
  const closeAllExtensionWindows = React.useCallback(async () => {
    const windows = await chrome.windows.getAll();
    for (const window of windows) {
      if (window.type === 'popup' && window.id) {
        await chrome.windows.remove(window.id);
      }
    }
  }, []);

  return { closeAllExtensionWindows };
};

export default useExtensionWindowManager;
