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

async function sendMessage<T = any>(
  message: CommandMessageData,
): Promise<CommandMessageData<T> | null> {
  try {
    return new Promise<CommandMessageData<T> | null>((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    }).catch((error) => {
      console.warn(error);
      return null;
    });
  } catch (e) {
    console.warn('Failed to send message', e);
  }
  return null;
}
