import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';

export const validateInjectionData = (requestData: InjectionMessage): InjectionMessage | null => {
  if (!validateInjectionTransactionType(requestData)) {
    return InjectionMessageInstance.failure(
      WalletResponseFailureType.UNSUPPORTED_TYPE,
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
      { requestData, address },
      requestData?.key,
    );
  }

  return null;
};

export const validateInjectionTransactionType = (requestData: InjectionMessage): any => {
  const messageTypes = ['/bank.MsgSend', '/vm.m_call', '/vm.m_addpkg', '/vm.m_run'];
  return requestData.data?.messages.every((message: any) => messageTypes.includes(message?.type));
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

    if (!validateCallerAddress(messageAddress, address)) {
      return false;
    }
  }

  return true;
};

const validateCallerAddress = (messageAddress: any, currentAddress: string): boolean => {
  if (messageAddress === '') {
    return true;
  }

  return messageAddress === currentAddress;
};
