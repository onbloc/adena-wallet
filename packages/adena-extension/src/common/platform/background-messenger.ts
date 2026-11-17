import type { CommandMessageData } from '@inject/message/command-message';

/**
 * How code shared between the extension and the mobile app talks to the wallet
 * "background": the place that holds the in-memory session key and owns the
 * auto-lock timer.
 *
 * In the extension that is the service worker, reached over
 * `chrome.runtime.sendMessage`. The mobile app has no separate process; it
 * registers an in-process implementation with `setBackgroundMessenger`.
 */
export interface BackgroundMessenger {
  /** Sends a command and resolves with the reply, or `null` when nobody answered. */
  sendCommand<T = any>(message: CommandMessageData): Promise<CommandMessageData<T> | null>;
  /** Fire-and-forget event for any listening UI surface (e.g. a transaction notification). */
  broadcast(message: unknown): Promise<void>;
}

// Chrome already answers the callback — with `chrome.runtime.lastError` set —
// when nothing is listening, so this only guards the pathological case: a
// background handler that keeps the message channel open (`return true`) and
// never calls `sendResponse`. Without the timeout that promise stays pending
// forever, and `isLocked()` never settles, which leaves the popup stuck on its
// boot spinner. Generous on purpose: it must never fire while a cold service
// worker is still starting up.
const RESPONSE_TIMEOUT_MS = 15_000;

export const chromeBackgroundMessenger: BackgroundMessenger = {
  async sendCommand<T = any>(
    message: CommandMessageData,
  ): Promise<CommandMessageData<T> | null> {
    try {
      return await new Promise<CommandMessageData<T> | null>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`No background response for '${message.command}'`);
          resolve(null);
        }, RESPONSE_TIMEOUT_MS);

        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);

          // Read it so Chrome does not log it as unchecked: an absent receiver is
          // an expected outcome here, handled by returning null.
          if (chrome.runtime.lastError) {
            console.warn(chrome.runtime.lastError.message);
            resolve(null);
            return;
          }

          resolve(response ?? null);
        });
      });
    } catch (e) {
      console.warn('Failed to send message', e);
    }
    return null;
  },

  async broadcast(message: unknown): Promise<void> {
    await chrome.runtime.sendMessage(message);
  },
};

let currentMessenger: BackgroundMessenger = chromeBackgroundMessenger;

export function setBackgroundMessenger(messenger: BackgroundMessenger): void {
  currentMessenger = messenger;
}

export function getBackgroundMessenger(): BackgroundMessenger {
  return currentMessenger;
}
