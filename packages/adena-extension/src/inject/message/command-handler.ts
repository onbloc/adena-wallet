import { WalletResponseFailureType, WalletResponseSuccessType } from '@adena-wallet/sdk';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { GnoDocumentInfo } from '@common/provider/gno';
import { GnoProvider } from '@common/provider/gno/gno-provider';
import { isInterRealmParameter } from '@common/provider/gno/utils';
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
  GnoArgumentInfo,
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

    const executor = new AdenaExecutor();

    const domain = new URL(window.location.href).hostname;
    const addEstablishResponse = await executor.addEstablish(domain);
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

    const gnoProvider = new GnoProvider(gnoConnectInfo.rpc, gnoConnectInfo.chainId);
    const realmDocument = await gnoProvider.getRealmDocument(gnoMessageInfo.packagePath);
    if (!realmDocument) {
      console.info('Realm document not found');
      return;
    }

    try {
      // Make TransactionParams
      const transactionParams = makeTransactionMessage(
        gnoMessageInfo,
        gnoConnectInfo,
        realmDocument,
      );

      executor.doContract(transactionParams, true).then(console.info).catch(console.info);
    } catch (error) {
      console.info(error);
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

function makeTransactionMessage(
  gnoMessageInfo: GnoMessageInfo,
  gnoConnectInfo: GnoConnectInfo,
  realmDocument: GnoDocumentInfo,
): TransactionParams & { gasFee: number; gasWanted: number } {
  const func = realmDocument.funcs.find((f) => f.name === gnoMessageInfo.functionName);
  if (!func) {
    throw new Error(`Function not found: ${gnoMessageInfo.functionName}`);
  }

  const gnoArguments: GnoArgumentInfo[] = func.params
    .filter((param) => !isInterRealmParameter(param.name, param.type))
    .map((param, index) => {
      const messageArguments = gnoMessageInfo.args || [];
      const arg = messageArguments.find((arg) => arg.key === param.name);
      const value = arg?.value || '';

      return {
        index,
        key: param.name,
        value,
      };
    });

  const messageArguments = gnoArguments.map((arg) => {
    return arg.value;
  });

  const messages: ContractMessage[] = [
    {
      type: '/vm.m_call',
      value: {
        caller: '',
        send: gnoMessageInfo.send,
        pkg_path: gnoMessageInfo.packagePath,
        func: gnoMessageInfo.functionName,
        args: messageArguments,
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
    arguments: gnoArguments,
  };
}
