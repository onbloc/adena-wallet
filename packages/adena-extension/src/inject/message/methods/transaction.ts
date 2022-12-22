import { WalletError } from '@common/errors';
import { LocalStorageValue } from '@common/values';
import { RoutePath } from '@router/path';
import { TransactionService } from '@services/index';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { loadGnoClient } from './wallet';

export const signAmino = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  const gnoClient = await loadGnoClient();
  const currentAccountAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
  if (!validateTransaction(currentAccountAddress, requestData, sendResponse)) {
    return;
  }
  if (!validateTransactionMessage(currentAccountAddress, requestData, sendResponse)) {
    return;
  }
  try {
    const signedDocumnet = await TransactionService.createAminoSign(
      gnoClient,
      currentAccountAddress,
      requestData?.data?.messages,
      requestData?.data?.gasWanted,
      requestData?.data?.gasFee,
      requestData?.data?.memo,
    );
    sendResponse(InjectionMessageInstance.success('SIGN_SUCCESS', signedDocumnet, requestData.key));
  } catch (error) {
    if (error instanceof WalletError) {
      if (error.getType() === 'NOT_FOUND_PASSWORD') {
        sendResponse(InjectionMessageInstance.failure('WALLET_LOCKED', error, requestData.key));
        return;
      }
      sendResponse(InjectionMessageInstance.failure('UNEXPECTED_ERROR', { error }, requestData.key));
    }
  }
}

export const doContract = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  const currentAccountAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
  if (!validateTransaction(currentAccountAddress, requestData, sendResponse)) {
    return;
  }
  if (!validateTransactionMessage(currentAccountAddress, requestData, sendResponse)) {
    return;
  }
  HandlerMethod.createPopup(
    RoutePath.ApproveLogin,
    requestData,
    InjectionMessageInstance.failure('TRANSACTION_REJECTED', requestData, requestData.key),
    sendResponse,
  );
};

const validateTransaction = (
  currentAccountAddress: string,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  if (!currentAccountAddress || currentAccountAddress === '') {
    sendResponse(InjectionMessageInstance.failure('NO_ACCOUNT', requestData, requestData.key));
    return false;
  }

  return true;
};

const validateTransactionMessage = (
  currentAccountAddress: string,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  const messages = requestData.data?.messages;
  for (const message of messages) {
    switch (message?.type) {
      case '/bank.MsgSend':
        if (currentAccountAddress !== message.value.from_address) {
          sendResponse(
            InjectionMessageInstance.failure('ACCOUNT_MISMATCH', requestData?.data, requestData?.key),
          );
          return false;
        }
        break;
      case '/vm.m_call':
        if (currentAccountAddress !== message.value.caller) {
          sendResponse(
            InjectionMessageInstance.failure('ACCOUNT_MISMATCH', requestData?.data, requestData?.key),
          );
          return false;
        }
        break;
      case '/vm.m_addpkg':
      default:
        sendResponse(
          InjectionMessageInstance.failure('UNSUPPORTED_TYPE', requestData?.data, requestData?.key),
        );
        return false;
    }
  }
  return true;
};
