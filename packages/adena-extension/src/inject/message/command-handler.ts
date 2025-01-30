import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { CommandMessageData } from './command-message';
import {
  clearInMemoryKey,
  decryptPassword,
  encryptPassword,
  getInMemoryKey,
} from './commands/encrypt';

export class CommandHandler {
  public static createHandler = async (
    inMemoryProvider: MemoryProvider,
    message: CommandMessageData,
    _: chrome.runtime.MessageSender,
    sendResponse: (response?: CommandMessageData) => void,
  ): Promise<void> => {
    try {
      if (message.code !== 0) {
        return;
      }

      if (message.command === 'encryptPassword') {
        if (!message.data.password) {
          throw new Error('Password is required');
        }

        const key = await getInMemoryKey(inMemoryProvider);
        if (!key) {
          throw new Error('Failed to get in-memory key');
        }

        const password = message.data.password;
        const responseData = await encryptPassword(key, password);

        sendResponse(makeSuccessResponse(message, responseData));
        return;
      }

      if (message.command === 'decryptPassword') {
        const key = await getInMemoryKey(inMemoryProvider);
        if (!key) {
          throw new Error('Failed to in-memory key');
        }

        const iv = message.data.iv;
        const encryptedPassword = message.data.encryptedPassword;
        const decryptedPassword = await decryptPassword(key, iv, encryptedPassword);

        const responseData = {
          password: decryptedPassword,
        };

        sendResponse(makeSuccessResponse(message, responseData));
        return;
      }

      if (message.command === 'clearEncryptKey') {
        await clearInMemoryKey(inMemoryProvider);
        sendResponse(makeSuccessResponse(message));
        return;
      }
    } catch (error) {
      console.error(error);
      sendResponse(makeInternalErrorResponse(message));
    }
  };
}

function makeSuccessResponse(message: CommandMessageData, data: any = null): CommandMessageData {
  return {
    ...message,
    code: 200,
    data,
  };
}

function makeInternalErrorResponse(message: CommandMessageData): CommandMessageData {
  return {
    ...message,
    code: 500,
  };
}
