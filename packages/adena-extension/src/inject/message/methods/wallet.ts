import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { getSiteName } from '@common/utils/client-utils';
import { RoutePath } from '@types';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

export const getAccount = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  try {
    const inMemoryKey = await core.getInMemoryKey();

    const isLocked = await core.isLockedBy(inMemoryKey);
    if (isLocked) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.WALLET_LOCKED,
          {},
          requestData.key,
        ),
      );
      return;
    }

    const currentAccountAddress = await core.getCurrentAddress(inMemoryKey);
    const network = await core.getCurrentNetwork();
    if (!currentAccountAddress || !network) {
      sendResponse(
        InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, {}, requestData.key),
      );
      return;
    }

    const accountInfo = await core.accountService.getAccountInfoByNetwork(
      currentAccountAddress,
      network.rpcUrl,
      network.chainId,
    );
    sendResponse(
      InjectionMessageInstance.success(
        WalletResponseSuccessType.GET_ACCOUNT_SUCCESS,
        { ...accountInfo, chainId: network.chainId },
        requestData.key,
      ),
    );
  } catch (error) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.NO_ACCOUNT,
        { error: error?.toString() },
        requestData.key,
      ),
    );
  }
};

export const getNetwork = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  try {
    const inMemoryKey = await core.getInMemoryKey();

    const isLocked = await core.isLockedBy(inMemoryKey);
    if (isLocked) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.WALLET_LOCKED,
          {},
          requestData.key,
        ),
      );
      return;
    }

    const currentAccountAddress = await core.getCurrentAddress(inMemoryKey);
    const network = await core.getCurrentNetwork();
    if (!currentAccountAddress || !network) {
      sendResponse(
        InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, {}, requestData.key),
      );
      return;
    }

    sendResponse(
      InjectionMessageInstance.success(
        WalletResponseSuccessType.GET_NETWORK_SUCCESS,
        {
          chainId: network.chainId,
          networkName: network.networkName,
          addressPrefix: network.addressPrefix,
          rpcUrl: network.rpcUrl,
          indexerUrl: network.indexerUrl || null,
        },
        requestData.key,
      ),
    );
  } catch (error) {
    sendResponse(
      InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, {}, requestData.key),
    );
  }
};

export const addEstablish = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<boolean> => {
  const inMemoryKey = await core.getInMemoryKey();

  const isLocked = await core.isLockedBy(inMemoryKey);

  const accountId = await core.getCurrentAccountId();
  const siteName = getSiteName(message.protocol, message.hostname);
  const isEstablished = await core.establishService.isEstablishedBy(accountId, siteName);
  if (isEstablished && !isLocked) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.ALREADY_CONNECTED,
        {},
        message.key,
      ),
    );
    return true;
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveEstablish,
    message,
    InjectionMessageInstance.failure(WalletResponseRejectType.CONNECTION_REJECTED, {}, message.key),
    sendResponse,
  );
  return true;
};
