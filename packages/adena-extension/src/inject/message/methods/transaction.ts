import { WalletResponseFailureType, WalletResponseRejectType } from '@adena-wallet/sdk';
import { validateSignArbitraryParams } from '@common/validation';
import { GNO_CHAIN } from '@common/utils/chain-utils';
import { SignArbitraryParams } from '@inject/types';
import { InjectCore } from './core';
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

export const signArbitrary = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  if (!validateSignArbitraryParams(requestData.data)) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.INVALID_FORMAT,
        {},
        requestData.key,
      ),
    );
    return;
  }

  // Refuse a signer the user does not hold before opening anything. A window
  // that says signing proves you control this address, while showing one you
  // do not, is misleading even for the moment it is up.
  //
  // A locked wallet has no resolvable account here, in which case this yields
  // and the approval page runs the same check once the user has unlocked.
  const inMemoryKey = await core.getInMemoryKey();
  const currentAccount = await core.getCurrentAccount(inMemoryKey);
  if (currentAccount) {
    const currentAddress = await currentAccount.getAddress(GNO_CHAIN.bech32Prefix);
    if (currentAddress !== (requestData.data as SignArbitraryParams).signer) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.ACCOUNT_MISMATCH,
          {},
          requestData.key,
        ),
      );
      return;
    }
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveSignArbitrary,
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
