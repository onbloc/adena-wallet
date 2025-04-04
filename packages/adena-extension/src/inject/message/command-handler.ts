import { WalletResponseFailureType, WalletResponseSuccessType } from '@adena-wallet/sdk';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { AdenaExecutor } from '@inject/executor';
import { ContractMessage, TransactionParams } from '@inject/types';
import { CheckMetadataMessageData, CommandMessageData } from './command-message';
import {
  clearInMemoryKey,
  decryptPassword,
  encryptPassword,
  getInMemoryKey,
} from './commands/encrypt';
import { clearPopup } from './commands/popup';
import {
  GnoConnectInfo,
  GnoMessageInfo,
  parseGnoConnectInfo,
  parseGnoMessageInfo,
} from './methods/gno-connect';

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
      console.info(error);
      sendResponse(makeInternalErrorResponse(message));
    }

    if (message.command === 'clearPopup') {
      await clearInMemoryKey(inMemoryProvider);
      await clearPopup();
      sendResponse({ ...message, code: 200 });
      return;
    }
  };

  public static createContentHandler = async (
    message: CommandMessageData<CheckMetadataMessageData>,
  ): Promise<void> => {
    if (message.code !== 0 || message.command !== 'checkMetadata' || !message.data) {
      return;
    }

    const currentUrl = window?.location?.href || '';
    const gnoMessageInfo = message.data.gnoMessageInfo || parseGnoMessageInfo(currentUrl);
    const gnoConnectInfo = message.data.gnoConnectInfo || parseGnoConnectInfo();

    if (gnoMessageInfo === null || gnoConnectInfo === null) {
      return;
    }

    // Make TransactionParams
    const transactionParams = makeTransactionMessage(gnoMessageInfo, gnoConnectInfo);

    const executor = new AdenaExecutor();

    const addEstablishResponse = await executor.addEstablish();
    // Not connected
    if (
      addEstablishResponse.type !== WalletResponseSuccessType.CONNECTION_SUCCESS &&
      addEstablishResponse.type !== WalletResponseFailureType.ALREADY_CONNECTED
    ) {
      console.info('response: ', addEstablishResponse);
      return;
    }

    const switchNetworkResponse = await executor.switchNetwork(gnoConnectInfo.chainId);
    if (
      switchNetworkResponse.type !== WalletResponseSuccessType.SWITCH_NETWORK_SUCCESS &&
      switchNetworkResponse.type !== WalletResponseFailureType.REDUNDANT_CHANGE_REQUEST &&
      switchNetworkResponse.type !== WalletResponseFailureType.UNADDED_NETWORK
    ) {
      console.info('response: ', switchNetworkResponse);
      return;
    }

    executor.doContract(transactionParams).then(console.info).catch(console.error);
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

function makeTransactionMessage(
  gnoMessageInfo: GnoMessageInfo,
  gnoConnectInfo: GnoConnectInfo,
): TransactionParams & { gasFee: number; gasWanted: number } {
  const args =
    gnoMessageInfo.args?.map((arg) => {
      return arg.value;
    }) || [];

  const messages: ContractMessage[] = [
    {
      type: '/vm.m_call',
      value: {
        caller: '',
        send: gnoMessageInfo.send,
        pkg_path: gnoMessageInfo.packagePath,
        func: gnoMessageInfo.functionName,
        args,
      },
    },
  ];

  return {
    messages,
    gasFee: 0,
    gasWanted: DEFAULT_GAS_WANTED,
    networkInfo: {
      chainId: gnoConnectInfo.chainId,
      rpcUrl: gnoConnectInfo.rpc,
    },
    arguments: gnoMessageInfo.args,
  };
}
