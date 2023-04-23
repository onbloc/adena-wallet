import { getSiteName } from '@common/utils/client-utils';
import { RoutePath } from '@router/path';
import { GnoClient } from 'gno-client';
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
    if (!currentAccountAddress) {
      return;
    }
    const currentNetwork = await core.chainService.getCurrentNetwork();
    const gnoClient = GnoClient.createNetworkByType(
      { ...currentNetwork },
      getNetworkMapperType(currentNetwork.chainId),
    );

    const account = await gnoClient.getAccount(currentAccountAddress);
    sendReponse(
      InjectionMessageInstance.success(
        'GET_ACCOUNT',
        { ...account, chainId: gnoClient.chainId },
        requestData.key,
      ),
    );
  } catch (error) {
    sendReponse(InjectionMessageInstance.response('NO_ACCOUNT', { error }, requestData.key));
  }
};

export const addEstablish = async (
  message: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  const core = new InjectCore();
  const account = await core.getCurrentAccount();
  if (!account) {
    return false;
  }

  const chainId = core.gnoClient?.chainId ?? '';

  const isLocked = await core.walletService.isLocked();
  const siteName = getSiteName(message.hostname);
  const isEstablised = await core.establishService.isEstablishedBy(account.id, chainId, siteName);

  if (isLocked) {
    HandlerMethod.createPopup(
      RoutePath.ApproveLogin,
      message,
      InjectionMessageInstance.failure('WALLET_LOCKED', message, message.key),
      sendResponse,
    );
    return true;
  }

  if (isEstablised) {
    sendResponse(InjectionMessageInstance.failure('ALREADY_CONNECTED', message, message.key));
    return true;
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveEstablish,
    message,
    InjectionMessageInstance.failure('CONNECTION_REJECTED', message, message.key),
    sendResponse,
  );
  return true;
};

const getNetworkMapperType = (chainId: string) => {
  switch (chainId) {
    case 'test2':
      return 'TEST2';
    case 'test3':
    default:
      return 'TEST3';
  }
};
