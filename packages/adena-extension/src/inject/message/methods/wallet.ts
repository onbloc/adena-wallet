import { WalletError } from '@common/errors';
import { LocalStorageValue } from '@common/values';
import { RoutePath } from '@router/path';
import { GnoClientService, WalletService } from '@services/index';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { GnoClient } from 'gno-client';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';

export const getAccount = async (
  requestData: InjectionMessage,
  sendReponse: (message: any) => void,
) => {
  try {
    const walletPassword = await WalletService.loadWalletPassword();
    const wallet = await WalletService.loadWalletWithPassword(walletPassword);
    await wallet.initAccounts();
    let currentAccountAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
    if (!currentAccountAddress || currentAccountAddress === '') {
      currentAccountAddress = wallet.getAccounts()[0].getAddress();
    }

    const gnoClient = await loadGnoClient();
    const account = await gnoClient.getAccount(currentAccountAddress);
    sendReponse(
      InjectionMessageInstance.success(
        'GET_ACCOUNT',
        { ...account, chainId: gnoClient.chainId },
        requestData.key,
      ),
    );
  } catch (error) {
    if (error instanceof WalletError) {
      if (error.getType() === 'NOT_FOUND_PASSWORD') {
        sendReponse(InjectionMessageInstance.failure('WALLET_LOCKED', {}, requestData.key));
        return;
      }
    }
    sendReponse(InjectionMessageInstance.failure('NO_ACCOUNT', { error }, requestData.key));
  }
};

export const addEstablish = async (
  message: InjectionMessage,
  sendResponse: (message: any) => void,
) => {
  const isLocked = await WalletService.isLocked();
  const isEstablised = await WalletService.isEstablished(message.hostname ?? '');
  if (!isLocked && isEstablised) {
    sendResponse(InjectionMessageInstance.failure('ALREADY_CONNECTED', message, message.key));
    return true;
  }

  const path = isLocked ? RoutePath.ApproveLogin : RoutePath.ApproveEstablish;
  HandlerMethod.createPopup(
    path,
    message,
    InjectionMessageInstance.failure('CONNECTION_REJECTED', message, message.key),
    sendResponse,
  );
};

export const loadGnoClient = async () => {
  const storedChainId = await LocalStorageValue.get('CURRENT_CHAIN_ID');
  const currentChainId = storedChainId !== '' ? storedChainId : 'test3';
  const networkConfigs = await GnoClientService.loadNetworkConfigs();
  const currentNetworkConfig =
    networkConfigs.find((network) => network.chainId === currentChainId) ?? networkConfigs[0];

  const gnoClient = GnoClient.createNetworkByType(
    currentNetworkConfig,
    getNetworkMapperType(currentNetworkConfig.chainId),
    fetchAdapter,
  );
  return gnoClient;
}

const getNetworkMapperType = (chainId: string) => {
  switch (chainId) {
    case 'test2':
      return 'TEST2';
    case 'test3':
      return 'TEST3';
    case 'main':
      return 'MAIN';
    default:
      return 'COMMON';
  }
};
