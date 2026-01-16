import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { Account, isMultisigAccount } from 'adena-module';
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
  skipCallerCheck?: boolean,
): InjectionMessage | null => {
  if (!validateInjectionTransactionType(requestData)) {
    return InjectionMessageInstance.failure(
      WalletResponseFailureType.UNSUPPORTED_TYPE,
      {},
      requestData?.key,
    );
  }

  if (!validateInjectionTransactionMessageWithAddress(requestData, address, skipCallerCheck)) {
    return InjectionMessageInstance.failure(
      WalletResponseFailureType.ACCOUNT_MISMATCH,
      { requestData, address },
      requestData?.key,
    );
  }

  return null;
};

export const validateInjectionDataForMultisig = (
  requestData: InjectionMessage,
  currentAccount: Account,
  address: string,
  skipCallerCheck?: boolean,
): InjectionMessage | null => {
  if (!isMultisigAccount(currentAccount)) {
    return InjectionMessageInstance.failure(
      WalletResponseFailureType.CREATE_MULTISIG_TRANSACTION_FAILED,
      { error: 'The current account is not a multisig account.' },
      requestData?.key,
    );
  }

  return validateInjectionDataWithAddress(requestData, address, skipCallerCheck);
};

export const validateInjectionTransactionType = (requestData: InjectionMessage): any => {
  const messageTypes = ['/bank.MsgSend', '/vm.m_call', '/vm.m_addpkg', '/vm.m_run'];

  const msgs = requestData.data?.messages || requestData.data?.msgs || [];
  return msgs.every((message: any) => messageTypes.includes(message?.type));
};

export const validateInjectionTransactionMessageWithAddress = (
  requestData: InjectionMessage,
  address: string,
  skipCallerCheck?: boolean,
): boolean => {
  const messages =
    requestData.data?.msgs ||
    requestData.data?.messages ||
    requestData.data?.multisigDocument?.tx?.msgs ||
    [];
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

    if (!validateCallerAddress(messageAddress, address, skipCallerCheck)) {
      return false;
    }
  }

  return true;
};

const validateCallerAddress = (
  messageAddress: any,
  currentAddress: string,
  skipCallerCheck?: boolean,
): boolean => {
  if (messageAddress === '') {
    return true;
  }

  if (skipCallerCheck) {
    return true;
  }

  return messageAddress === currentAddress;
};
