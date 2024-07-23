import { RoutePath } from '@types';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

export const signAmino = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  const core = new InjectCore();
  const locked = await core.walletService.isLocked();
  if (!locked) {
    const address = await core.getCurrentAddress();
    const validationMessage = validateInjectionData(address, requestData);
    if (validationMessage) {
      sendResponse(validationMessage);
      return;
    }
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveSign,
    requestData,
    InjectionMessageInstance.failure('SIGN_REJECTED', {}, requestData.key),
    sendResponse,
  );
};

export const signTransaction = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  const core = new InjectCore();
  const locked = await core.walletService.isLocked();
  if (!locked) {
    const address = await core.getCurrentAddress();
    const validationMessage = validateInjectionData(address, requestData);
    if (validationMessage) {
      sendResponse(validationMessage);
      return;
    }
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveSignTransaction,
    requestData,
    InjectionMessageInstance.failure('SIGN_REJECTED', {}, requestData.key),
    sendResponse,
  );
};

export const doContract = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  const core = new InjectCore();
  const locked = await core.walletService.isLocked();
  if (!locked) {
    const address = await core.getCurrentAddress();
    const validationMessage = validateInjectionData(address, requestData);
    if (validationMessage) {
      sendResponse(validationMessage);
      return;
    }
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveTransaction,
    requestData,
    InjectionMessageInstance.failure('TRANSACTION_REJECTED', {}, requestData.key),
    sendResponse,
  );
};

export const validateInjectionData = (
  address: string | null,
  requestData: InjectionMessage,
): InjectionMessage | null => {
  if (!address) {
    return InjectionMessageInstance.failure('NO_ACCOUNT', {}, requestData.key);
  }
  if (!validateInjectionAddress(address)) {
    return InjectionMessageInstance.failure('NO_ACCOUNT', {}, requestData.key);
  }
  if (!validateInjectionTransactionType(requestData)) {
    return InjectionMessageInstance.failure('UNSUPPORTED_TYPE', {}, requestData?.key);
  }
  if (!validateInjectionTransactionMessage(address, requestData)) {
    return InjectionMessageInstance.failure('ACCOUNT_MISMATCH', {}, requestData?.key);
  }
  return null;
};

export const validateInjectionAddress = (currentAccountAddress: string): boolean => {
  if (!currentAccountAddress || currentAccountAddress === '') {
    return false;
  }

  return true;
};

export const validateInjectionTransactionType = (requestData: InjectionMessage): any => {
  const messageTypes = ['/bank.MsgSend', '/vm.m_call', '/vm.m_addpkg', '/vm.m_run', '/vm.m_noop'];
  return requestData.data?.messages.every((message: any) => messageTypes.includes(message?.type));
};

export const validateInjectionTransactionMessage = (
  currentAccountAddress: string,
  requestData: InjectionMessage,
): boolean => {
  const messages = requestData.data?.messages;
  for (const message of messages) {
    switch (message?.type) {
      case '/bank.MsgSend':
        if (currentAccountAddress !== message.value.from_address) {
          return false;
        }
        break;
      case '/vm.m_call':
        if (currentAccountAddress !== message.value.caller) {
          return false;
        }
        break;
      case '/vm.m_addpkg':
        if (currentAccountAddress !== message.value.creator) {
          return false;
        }
        break;
      case '/vm.m_run':
        if (currentAccountAddress !== message.value.caller) {
          return false;
        }
        break;
      default:
        break;
    }
  }
  return true;
};
