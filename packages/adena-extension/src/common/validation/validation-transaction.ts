import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { isBech32Address } from '@common/utils/string-utils';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';

export const validateInjectionData = (requestData: InjectionMessage): InjectionMessage | null => {
  if (!validateInjectionTransactionType(requestData)) {
    return InjectionMessageInstance.failure(
      WalletResponseFailureType.UNSUPPORTED_TYPE,
      {},
      requestData?.key,
    );
  }
  if (!validateInjectionTransactionMessage(requestData)) {
    return InjectionMessageInstance.failure(
      WalletResponseFailureType.ACCOUNT_MISMATCH,
      {},
      requestData?.key,
    );
  }
  return null;
};

export const validateInjectionDataWithAddress = (
  requestData: InjectionMessage,
  address: string,
): InjectionMessage | null => {
  if (!validateInjectionTransactionType(requestData)) {
    return InjectionMessageInstance.failure(
      WalletResponseFailureType.UNSUPPORTED_TYPE,
      {},
      requestData?.key,
    );
  }

  if (!validateInjectionTransactionMessageWithAddress(requestData, address)) {
    return InjectionMessageInstance.failure(
      WalletResponseFailureType.ACCOUNT_MISMATCH,
      {},
      requestData?.key,
    );
  }

  return null;
};

export const validateInjectionTransactionType = (requestData: InjectionMessage): any => {
  const messageTypes = ['/bank.MsgSend', '/vm.m_call', '/vm.m_addpkg', '/vm.m_run'];
  return requestData.data?.messages.every((message: any) => messageTypes.includes(message?.type));
};

export const validateInjectionTransactionMessage = (requestData: InjectionMessage): boolean => {
  const messages = requestData.data?.messages;
  for (const message of messages) {
    let address = '';
    switch (message?.type) {
      case '/bank.MsgSend':
        address = message.value.from_address;
        break;
      case '/vm.m_call':
        address = message.value.caller;
        break;
      case '/vm.m_addpkg':
        address = message.value.creator;
        break;
      case '/vm.m_run':
        address = message.value.caller;
        break;
      default:
        break;
    }

    if (!isBech32Address(address)) {
      return false;
    }
  }
  return true;
};

export const validateInjectionTransactionMessageWithAddress = (
  requestData: InjectionMessage,
  address: string,
): boolean => {
  const messages = requestData.data?.messages;
  for (const message of messages) {
    let messageAddress = '';
    switch (message?.type) {
      case '/bank.MsgSend':
        messageAddress = message.value.from_address;
        break;
      case '/vm.m_call':
        messageAddress = message.value.caller;
        break;
      case '/vm.m_addpkg':
        messageAddress = message.value.creator;
        break;
      case '/vm.m_run':
        messageAddress = message.value.caller;
        break;
      default:
        break;
    }

    if (messageAddress !== address) {
      return false;
    }
  }
  return true;
};
