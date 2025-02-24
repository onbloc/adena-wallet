import { CommandMessage, CommandMessageData } from '@inject/message/command-message';
import CryptoJS from 'crypto-js';

const salt = 'W9+fs3FJ9p5KdR1XzQy2A6ZT4vjN8LvM9J8pVZmN9rU=';

export const encryptSha256Password = (password: string, salt = ''): string => {
  return CryptoJS.SHA256(salt + password).toString();
};

export const encryptWalletPassword = (password: string): string => {
  return encryptSha256Password(password, salt);
};

// Sends a message to the background script to encrypt a password
export const encryptPassword = async (
  password: string,
): Promise<{ encryptedKey: string; encryptedPassword: string }> => {
  const result = await sendMessage(CommandMessage.command('encryptPassword', { password }));
  if (result.code !== 200) {
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
  if (result.code !== 200 || !result.data?.password) {
    throw new Error('Encryption key not initialized.');
  }

  return result.data.password;
};

export const clearInMemoryKey = async (): Promise<void> => {
  await sendMessage(CommandMessage.command('clearEncryptKey'));
};

function sendMessage<T = any>(message: CommandMessageData): Promise<CommandMessageData<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}
