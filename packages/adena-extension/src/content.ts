import { EVENT_KEYS } from '@common/constants/event-key.constant';
import { EventMessageData } from '@inject/message';
import { CommandHandler } from '@inject/message/command-handler';
import { CommandMessageData } from '@inject/message/command-message';
import { GnoInterceptorManager } from '@inject/message/methods/gno-interceptor-manager';
import { GnoSessionUpdateMessage } from '@inject/message/methods/gno-session';

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
      console.warn(e);
    }
  };

  window.addEventListener('message', listener, false);
};

const initExtensionListener = (): void => {
  chrome.runtime.onMessage.addListener(
    (message: EventMessageData | CommandMessageData, _sender, sendResponse) => {
      if (message.status === 'event') {
        const changedAccountEvent = new CustomEvent(EVENT_KEYS[message.type], {
          detail: message.data,
        });

        window.dispatchEvent(changedAccountEvent);
        sendResponse({ received: true });
        return;
      }

      if (message.status === 'command') {
        const result = CommandHandler.createContentHandler(message);
        sendResponse({ received: true, result });
        return;
      }

      sendResponse({ received: true });
    },
  );
};

const sendMessage = async (event: MessageEvent): Promise<void> => {
  const message = event.data;

  try {
    const isConnected = await new Promise<boolean>((resolve) => {
      chrome.runtime.sendMessage({ type: 'ping' }, () => {
        resolve(!chrome.runtime.lastError);
      });
    }).catch((error) => {
      console.warn('Failed to send message', error);
      return false;
    });

    if (!isConnected) {
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to send message:', chrome.runtime.lastError);
        return;
      }

      Promise.resolve(response)
        .then((result) => {
          if (event.source) {
            event.source.postMessage(result, {
              targetOrigin: event.origin,
            });
          }
        })
        .catch((error) => {
          console.warn('Error processing response:', error);
        });
      return true;
    });
  } catch (e) {
    console.warn('Failed to send message to runtime', e);
  }
};

/**
 * Initialize GNO interceptors
 * Uses GnoInterceptorManager to register anchor, form submit, and event watcher interceptors
 */
const initGnoInterceptors = (): void => {
  const manager = GnoInterceptorManager.getInstance();

  manager.initialize((message: GnoSessionUpdateMessage) => {
    sendGnoSessionUpdate(message);
  });
};

/**
 * Sends GnoSessionUpdateMessage to the background script.
 */
const sendGnoSessionUpdate = async (message: GnoSessionUpdateMessage): Promise<void> => {
  try {
    const isConnected = await new Promise<boolean>((resolve) => {
      chrome.runtime.sendMessage({ type: 'ping' }, () => {
        resolve(!chrome.runtime.lastError);
      });
    }).catch(() => false);

    if (!isConnected) {
      return;
    }

    chrome.runtime.sendMessage(message).catch((error) => {
      console.warn('Failed to send GnoSessionUpdate:', error);
    });
  } catch {
    console.warn('Failed to send GnoSessionUpdateMessage to background');
  }
};

initGnoInterceptors();
loadScript();
initListener();
initExtensionListener();
