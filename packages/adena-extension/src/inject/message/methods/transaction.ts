import { LocalStorageValue } from '@common/values';
import { RoutePath } from '@router/path';
import { GnoClientService, TransactionService } from '@services/index';
import { GnoClient } from 'gno-client';
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
  const signedDocumnet = await TransactionService.createSignDocument(
    gnoClient,
    currentAccountAddress,
    requestData?.data?.message,
    requestData?.data?.gasWanted,
    requestData?.data?.gasFee,
    requestData?.data?.memo,
  );
  sendResponse(InjectionMessageInstance.success('SIGN_SUCCESS', signedDocumnet, requestData.key));
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
  const message = requestData.data?.message;
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
  return true;
};
