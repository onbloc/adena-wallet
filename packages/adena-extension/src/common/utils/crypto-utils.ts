import { CommandMessage, CommandMessageData } from '@inject/message/command-message';

// Sends a message to the background script to encrypt a password
export const encryptPassword = async (
  password: string,
): Promise<{ encryptedKey: string; encryptedPassword: string }> => {
  const result = await sendMessage(CommandMessage.command('encryptPassword', { password }));
  if (!result || result.code !== 200) {
    throw new Error('Encryption key not initialized.');
  }

  return {
    encryptedKey: result.data.encryptedKey,
    encryptedPassword: result.data.encryptedPassword,
  };
};

// Sends a message to the background script to encrypt a password
export const decryptPassword = async (iv: string, encryptedPassword: string): Promise<string> => {
  const result = await sendMessage(
    CommandMessage.command('decryptPassword', {
      iv,
      encryptedPassword,
    }),
  );
  if (!result || result?.code !== 200 || !result?.data?.password) {
    throw new Error('Encryption key not initialized.');
  }

  return result.data.password;
};

export const clearInMemoryKey = async (): Promise<void> => {
  await sendMessage(CommandMessage.command('clearEncryptKey'));
};

// Chrome already answers the callback — with `chrome.runtime.lastError` set —
// when nothing is listening, so this only guards the pathological case: a
// background handler that keeps the message channel open (`return true`) and
// never calls `sendResponse`. Without the timeout that promise stays pending
// forever, and `isLocked()` never settles, which leaves the popup stuck on its
// boot spinner. Generous on purpose: it must never fire while a cold service
// worker is still starting up.
const RESPONSE_TIMEOUT_MS = 15_000;

async function sendMessage<T = any>(
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
}
