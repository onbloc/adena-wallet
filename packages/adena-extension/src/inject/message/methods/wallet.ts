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
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  try {
    const core = new InjectCore();

    const isLocked = await core.walletService.isLocked();
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

    const currentAccountAddress = await core.getCurrentAddress();
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
      InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, {}, requestData.key),
    );
  }
};

export const getNetwork = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  try {
    const core = new InjectCore();

    const isLocked = await core.walletService.isLocked();
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

    const currentAccountAddress = await core.getCurrentAddress();
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
  message: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<boolean> => {
  const core = new InjectCore();
  const accountId = await core.getCurrentAccountId();
  const isLocked = await core.walletService.isLocked();
  const siteName = getSiteName(message.protocol, message.hostname);

  if (!isLocked) {
    const isEstablished = await core.establishService.isEstablishedBy(accountId, siteName);
    if (isEstablished) {
      sendResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.CONNECTION_SUCCESS,
          {},
          message.key,
        ),
      );
      return true;
    }
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveEstablish,
    message,
    InjectionMessageInstance.failure(WalletResponseRejectType.CONNECTION_REJECTED, {}, message.key),
    sendResponse,
  );
  return true;
};
