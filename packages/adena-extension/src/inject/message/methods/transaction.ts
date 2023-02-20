import { AdenaStorage } from '@common/storage';
import { WalletAccountRepository } from '@repositories/wallet';
import { RoutePath } from '@router/path';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';

export const signAmino = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  const localStorage = AdenaStorage.local();
  const accountRepository = new WalletAccountRepository(localStorage);
  const address = await accountRepository.getCurrentAccountAddress();
  if (!validateTransaction(address, requestData, sendResponse)) {
    return;
  }
  if (!validateTransactionMessage(address, requestData, sendResponse)) {
    return;
  }
  HandlerMethod.createPopup(
    RoutePath.ApproveLogin,
    requestData,
    InjectionMessageInstance.failure('SIGN_REJECTED', requestData, requestData.key),
    sendResponse,
  );
}

export const doContract = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  const localStorage = AdenaStorage.local();
  const accountRepository = new WalletAccountRepository(localStorage);
  const address = await accountRepository.getCurrentAccountAddress();
  if (!validateTransaction(address, requestData, sendResponse)) {
    return;
  }
  if (!validateTransactionMessage(address, requestData, sendResponse)) {
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
        if (currentAccountAddress !== message.value.creator) {
          sendResponse(
            InjectionMessageInstance.failure('ACCOUNT_MISMATCH', requestData?.data, requestData?.key),
          );
          return false;
        }
        break;
      default:
        sendResponse(
          InjectionMessageInstance.failure('UNSUPPORTED_TYPE', requestData?.data, requestData?.key),
        );
        return false;
    }
  }
  return true;
};
