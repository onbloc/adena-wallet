import { clearInMemoryKey, decryptPassword, encryptPassword } from '@common/utils/crypto-utils';
import type { CommandMessageData } from '@inject/message/command-message';
import {
  BackgroundMessenger,
  chromeBackgroundMessenger,
  getBackgroundMessenger,
  setBackgroundMessenger,
} from './background-messenger';

describe('BackgroundMessenger seam', () => {
  afterEach(() => setBackgroundMessenger(chromeBackgroundMessenger));

  it('defaults to the chrome runtime implementation', () => {
    expect(getBackgroundMessenger()).toBe(chromeBackgroundMessenger);
  });

  it('routes session password commands through the registered messenger', async () => {
    const sent: string[] = [];
    const reply = (message: CommandMessageData, data: unknown): CommandMessageData<any> => ({
      ...message,
      code: 200,
      data,
    });
    const messenger: BackgroundMessenger = {
      sendCommand: async (message) => {
        sent.push(message.command);
        if (message.command === 'encryptPassword') {
          return reply(message, { encryptedKey: 'iv', encryptedPassword: 'enc' });
        }
        if (message.command === 'decryptPassword') {
          return reply(message, { password: 'secret' });
        }
        return reply(message, null);
      },
      broadcast: async () => undefined,
    };
    setBackgroundMessenger(messenger);

    await expect(encryptPassword('secret')).resolves.toEqual({
      encryptedKey: 'iv',
      encryptedPassword: 'enc',
    });
    await expect(decryptPassword('iv', 'enc')).resolves.toBe('secret');
    await clearInMemoryKey();

    expect(sent).toEqual(['encryptPassword', 'decryptPassword', 'clearEncryptKey']);
  });

  it('fails closed when the messenger gets no answer', async () => {
    setBackgroundMessenger({ sendCommand: async () => null, broadcast: async () => undefined });

    await expect(encryptPassword('secret')).rejects.toThrow('Encryption key not initialized.');
    await expect(decryptPassword('iv', 'enc')).rejects.toThrow('Encryption key not initialized.');
  });
});
