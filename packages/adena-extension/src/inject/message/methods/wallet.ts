import { getSiteName } from '@common/utils/client-utils';
import { RoutePath } from '@router/path';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

export const getAccount = async (
  requestData: InjectionMessage,
  sendReponse: (message: any) => void,
) => {
  try {
    const core = new InjectCore();

    const isLocked = await core.walletService.isLocked();
    if (isLocked) {
      sendReponse(InjectionMessageInstance.failure('WALLET_LOCKED', {}, requestData.key));
      return;
    }

    const currentAccountAddress = await core.getCurrentAddress();
    const network = await core.getCurrentNetwork();
    if (!currentAccountAddress || !network) {
      sendReponse(InjectionMessageInstance.failure('NO_ACCOUNT', {}, requestData.key));
      return;
    }

    const accountInfo = await core.accountService.getAccountInfoByNetwork(
      currentAccountAddress,
      network.rpcUrl,
      network.chainId,
    );
    sendReponse(
      InjectionMessageInstance.success('GET_ACCOUNT', { ...accountInfo }, requestData.key),
    );
  } catch (error) {
    sendReponse(InjectionMessageInstance.failure('NO_ACCOUNT', {}, requestData.key));
  }
};

export const addEstablish = async (
  message: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  const core = new InjectCore();
  const accountId = await core.getCurrentAccountId();
  const networkId = await core.getCurrentNetworkId();
  const isLocked = await core.walletService.isLocked();
  const siteName = getSiteName(message.protocol, message.hostname);

  if (!isLocked) {
    const isEstablised = await core.establishService.isEstablishedBy(
      accountId,
      networkId,
      siteName,
    );
    if (isEstablised) {
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
