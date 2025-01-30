import { EVENT_KEYS } from '@common/constants/event-key.constant';
import { EventMessageData } from '@inject/message';

const sendMessage = (event: MessageEvent): void => {
  const message = event.data;
  chrome.runtime.sendMessage(message, (response) => {
    Promise.resolve(response).then((result) => {
      event.source?.postMessage(result, {
        targetOrigin: event.origin,
      });
    });
    return true;
  });
};

const loadScript = (): void => {
  const container = document.head || document.documentElement;
  const scriptElement = document.createElement('script');
  scriptElement.src = chrome.runtime.getURL('inject.js');
  scriptElement.type = 'text/javascript';
  container.insertBefore(scriptElement, container.children[0]);
  scriptElement.remove();
};

const initListener = (): void => {
  const listener = (event: MessageEvent): void => {
    if (event.origin !== window.location.origin) {
      console.warn(`Untrusted origin: ${event.origin}`);
      return;
    }

    try {
      if (event.data?.status === 'request') {
        sendMessage(event);
      } else {
        return event.data;
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.addEventListener('message', listener, false);
};

const initExtensionListener = (): void => {
  chrome.runtime.onMessage.addListener((message: EventMessageData) => {
    if (message.status === 'event') {
      const changedAccountEvent = new CustomEvent(EVENT_KEYS[message.type], {
        detail: message.data,
      });
      window.dispatchEvent(changedAccountEvent);
    }
  });
};

loadScript();
initListener();
initExtensionListener();
