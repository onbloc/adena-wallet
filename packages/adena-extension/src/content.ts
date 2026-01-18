import { EVENT_KEYS } from '@common/constants/event-key.constant';
import { EventMessageData } from '@inject/message';
import { CommandHandler } from '@inject/message/command-handler';
import { CommandMessage, CommandMessageData } from '@inject/message/command-message';
import {
  parseGnoConnectInfo,
  parseGnoMessageInfo,
  shouldIntercept,
  shouldRegisterAnchorIntercept,
} from '@inject/message/methods/gno-connect';
import { GnoDOMWatcher } from '@inject/message/methods/gno-dom-watcher';
import { GnoWebEventWatcher } from '@inject/message/methods/gno-web-event-watcher';
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
  chrome.runtime.onMessage.addListener((message: EventMessageData | CommandMessageData) => {
    if (message.status === 'event') {
      const changedAccountEvent = new CustomEvent(EVENT_KEYS[message.type], {
        detail: message.data,
      });

      window.dispatchEvent(changedAccountEvent);
      return;
    }

    if (message.status === 'command') {
      return CommandHandler.createContentHandler(message);
    }
  });
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
 * Initializes anchor intercept for gno web tx link.
 * This function checks if the current page is a gno web tx link
 * and if so, intercepts anchor clicks to handle gno web tx link.
 *
 * @returns void
 */
const initAnchorIntercept = (): void => {
  if (!shouldRegisterAnchorIntercept()) {
    return;
  }

  const gnoConnectInfo = parseGnoConnectInfo();

  document.addEventListener(
    'click',
    (e) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor?.href) return;

      const url = new URL(anchor.href, location.origin);
      if (!shouldIntercept(url.href)) {
        return;
      }

      const gnoMessageInfo = parseGnoMessageInfo(url.href);
      if (gnoMessageInfo === null) {
        return;
      }

      e.preventDefault();

      CommandHandler.createContentHandler(
        CommandMessage.command('checkMetadata', {
          gnoMessageInfo,
          gnoConnectInfo,
        }),
      );
    },
    true,
  );
};

/**
 * Initializes GnoDOMWatcher for real-time parameter tracking.
 * This watches Gnoweb ActionFunctionController DOM elements and sends
 * updates to the background script when parameters change.
 */
const initGnoDOMWatcher = (): void => {
  if (!shouldRegisterAnchorIntercept()) {
    return;
  }

  const watcher = new GnoDOMWatcher((message: GnoSessionUpdateMessage) => {
    // Send update to background
    sendGnoSessionUpdate(message);
  });

  // Start watching after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => watcher.start());
  } else {
    watcher.start();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => watcher.stop());
};

/**
 * 🆕 Initialize GnoWebEventWatcher
 * Subscribes to Gnoweb custom events and forwards to background
 */
const initGnoWebEventWatcher = (): void => {
  if (!shouldRegisterAnchorIntercept()) {
    console.log('[Adena] GnoWebEventWatcher skipped (no gno:connect meta tag)');
    return;
  }

  const watcher = new GnoWebEventWatcher((message: GnoSessionUpdateMessage) => {
    sendGnoSessionUpdate(message);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      watcher.start();
    });
  } else {
    watcher.start();
  }

  window.addEventListener('beforeunload', () => {
    watcher.stop();
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

    chrome.runtime.sendMessage(message);
  } catch {
    console.warn('Failed to send GnoSessionUpdateMessage to background');
  }
};

initAnchorIntercept();
initGnoDOMWatcher();
initGnoWebEventWatcher();
loadScript();
initListener();
initExtensionListener();
