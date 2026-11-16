import { WalletResponseRejectType } from '@adena-wallet/sdk';
import { validateInjectionData } from '@common/validation/validation-transaction';
import { RoutePath } from '@types';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';
import { rejectSessionAccountUnsupported } from './session-account-guard';

export const createMultisigAccount = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  if (await rejectSessionAccountUnsupported(core, requestData, sendResponse)) {
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.CreateMultisigAccount,
    requestData,
    InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, requestData.key),
    sendResponse,
  );
};

export const createMultisigDocument = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  if (await rejectSessionAccountUnsupported(core, requestData, sendResponse)) {
    return;
  }

  const validationMessage = validateInjectionData(requestData);
  if (validationMessage) {
    sendResponse(validationMessage);
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.CreateMultisigTransaction,
    requestData,
    InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, requestData.key),
    sendResponse,
  );
};

export const signMultisigDocument = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  if (await rejectSessionAccountUnsupported(core, requestData, sendResponse)) {
    return;
  }

  const validationMessage = validateInjectionData(requestData);
  if (validationMessage) {
    sendResponse(validationMessage);
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.SignMultisigDocument,
    requestData,
    InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, requestData.key),
    sendResponse,
  );
};

export const broadcastMultisigTransaction = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  if (await rejectSessionAccountUnsupported(core, requestData, sendResponse)) {
    return;
  }

  const validationMessage = validateInjectionData(requestData);
  if (validationMessage) {
    sendResponse(validationMessage);
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.BroadcastMultisigTransaction,
    requestData,
    InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, requestData.key),
    sendResponse,
  );
};
