import { getBackgroundMessenger } from '@common/platform/background-messenger';
import { CommandMessage } from '@inject/message/command-message';

// Sends a message to the background script to encrypt a password
export const encryptPassword = async (
  password: string,
): Promise<{ encryptedKey: string; encryptedPassword: string }> => {
  const result = await getBackgroundMessenger().sendCommand(
    CommandMessage.command('encryptPassword', { password }),
  );
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
  const result = await getBackgroundMessenger().sendCommand(
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
  await getBackgroundMessenger().sendCommand(CommandMessage.command('clearEncryptKey'));
};
