import { EventMessageData } from '@inject/message';

export type UseEventReturn = {
  dispatchEvent: (message: EventMessageData) => void;
};

export const useEvent = (): UseEventReturn => {
  function dispatchEvent(message: EventMessageData): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
      const currentTab = currentTabs.length > 0 ? currentTabs[0] : null;
      if (!currentTab || !currentTab.id) {
        return;
      }
      const tabId = currentTab.id;
      chrome.tabs.sendMessage(tabId, message);
    });
  }

  return { dispatchEvent };
};
