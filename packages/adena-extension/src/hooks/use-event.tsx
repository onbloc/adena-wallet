import { EventMessageData } from "@inject/message"

export const useEvent = (): {
  dispatchEvent: (message: EventMessageData) => void;
} => {

  function dispatchEvent(message: EventMessageData) {
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
}