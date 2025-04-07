import { WalletResponseRejectType } from '@adena-wallet/sdk';
import { validateInjectionData } from '@common/validation/validation-transaction';
import { RoutePath } from '@types';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';

export const signAmino = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
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
