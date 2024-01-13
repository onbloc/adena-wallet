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
      sendResponse(InjectionMessageInstance.failure('WALLET_LOCKED', {}, requestData.key));
      return;
    }

    const currentAccountAddress = await core.getCurrentAddress();
    const network = await core.getCurrentNetwork();
    if (!currentAccountAddress || !network) {
      sendResponse(InjectionMessageInstance.failure('NO_ACCOUNT', {}, requestData.key));
      return;
    }

    const accountInfo = await core.accountService.getAccountInfoByNetwork(
      currentAccountAddress,
      network.rpcUrl,
      network.chainId,
    );
    sendResponse(
      InjectionMessageInstance.success(
        'GET_ACCOUNT',
        { ...accountInfo, chainId: network.chainId },
        requestData.key,
      ),
    );
  } catch (error) {
    sendResponse(InjectionMessageInstance.failure('NO_ACCOUNT', {}, requestData.key));
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
      sendResponse(InjectionMessageInstance.failure('ALREADY_CONNECTED', {}, message.key));
      return true;
    }
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveEstablish,
    message,
    InjectionMessageInstance.failure('CONNECTION_REJECTED', {}, message.key),
    sendResponse,
  );
  return true;
};
