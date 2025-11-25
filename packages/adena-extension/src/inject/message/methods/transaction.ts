import { WalletResponseRejectType } from '@adena-wallet/sdk';
import { validateInjectionData } from '@common/validation/validation-transaction';
import { RoutePath } from '@types';
import { HandlerMethod } from '..';
import {
  InjectionMessage,
  InjectionMessageInstance,
  InjectionMessageWithSignature,
} from '../message';

export const signAmino = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  console.log('시작 5! signAmino 실행');
  const validationMessage = validateInjectionData(requestData);
  if (validationMessage) {
    sendResponse(validationMessage);
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveSign,
    requestData,
    InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, requestData.key),
    sendResponse,
  );
};

export const signTransaction = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  console.log(requestData, 'signTransaction 실행!@@@');
  const validationMessage = validateInjectionData(requestData);
  if (validationMessage) {
    sendResponse(validationMessage);
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveSignTransaction,
    requestData,
    InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, requestData.key),
    sendResponse,
  );
};

export const signDocument = async (
  requestData: InjectionMessageWithSignature,
  sendResponse: (message: any) => void,
): Promise<void> => {
  console.log('signDocument 실행@@@@@@@@@@@@@@@@@@@@@@@@@@');
  const validationMessage = validateInjectionData(requestData);
  console.log(validationMessage, 'validationMessage!!!!!!!!!!');
  if (validationMessage) {
    sendResponse(validationMessage);
    return;
  }

  console.log('팝업생성');
  HandlerMethod.createPopup(
    RoutePath.ApproveSignDocument,
    requestData,
    InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, requestData.key),
    sendResponse,
  );
};

export const signDocument2 = async (
  requestData: InjectionMessageWithSignature,
  sendResponse: (message: any) => void,
): Promise<void> => {
  console.log(requestData, 'signDocument2 실행@@@@@@@@@@@@@@@@@@@@@@@@@@');
  const validationMessage = validateInjectionData(requestData);
  console.log(validationMessage, 'validationMessage!!!!!!!!!!');
  if (validationMessage) {
    sendResponse(validationMessage);
    return;
  }

  console.log('팝업생성');
  HandlerMethod.createPopup(
    RoutePath.ApproveSignDocument,
    requestData,
    InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, requestData.key),
    sendResponse,
  );
};

export const doContract = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  const validationMessage = validateInjectionData(requestData);
  if (validationMessage) {
    sendResponse(validationMessage);
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveTransaction,
    requestData,
    InjectionMessageInstance.failure(
      WalletResponseRejectType.TRANSACTION_REJECTED,
      {},
      requestData.key,
    ),
    sendResponse,
  );
};
