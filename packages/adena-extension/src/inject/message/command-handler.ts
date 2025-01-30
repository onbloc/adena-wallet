import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { CommandMessageData } from './command-message';
import {
  clearInMemoryKey,
  decryptPassword,
  encryptPassword,
  getInMemoryKey,
} from './commands/encrypt';
import { clearPopup } from './commands/popup';

export class CommandHandler {
  public static createHandler = async (
    inMemoryProvider: MemoryProvider,
    message: CommandMessageData,
    _: chrome.runtime.MessageSender,
    sendResponse: (response?: CommandMessageData) => void,
  ): Promise<void> => {
    if (message.code !== 0) {
      return;
    }

    if (message.command === 'encryptPassword') {
      const key = await getInMemoryKey(inMemoryProvider);
      if (!key) {
        sendResponse({
          ...message,
          code: 500,
        });
        return;
      }

      const password = message.data.password;
      const resultData = await encryptPassword(key, password);

      sendResponse({
        ...message,
        code: 200,
        data: resultData,
      });

      return;
    }

    if (message.command === 'decryptPassword') {
      const key = await getInMemoryKey(inMemoryProvider);
      if (!key) {
        sendResponse({
          ...message,
          code: 500,
        });
        return;
      }

      const iv = message.data.iv;
      const encryptedPassword = message.data.encryptedPassword;
      const decryptedPassword = await decryptPassword(key, iv, encryptedPassword);

      sendResponse({
        ...message,
        code: 200,
        data: {
          password: decryptedPassword,
        },
      });
      return;
    }

    if (message.command === 'clearEncryptKey') {
      await clearInMemoryKey(inMemoryProvider);
      sendResponse({ ...message, code: 200 });
      return;
    }

    if (message.command === 'clearPopup') {
      await clearInMemoryKey(inMemoryProvider);
      await clearPopup();
      sendResponse({ ...message, code: 200 });
      return;
    }
  };
}
