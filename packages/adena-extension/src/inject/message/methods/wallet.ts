import { WalletError } from '@common/errors';
import { RoutePath } from '@router/path';
import { ResourceService, WalletService } from '@services/index';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { GnoClient } from 'gno-client';
import { WalletRepository } from '@repositories/wallet';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { ChainRepository } from '@repositories/common';

export const getAccount = async (
  requestData: InjectionMessage,
  sendReponse: (message: any) => void,
) => {
  try {
    const walletPassword = await WalletService.loadWalletPassword();
    const wallet = await WalletService.loadWalletWithPassword(walletPassword);
    await wallet.initAccounts();
    let currentAccountAddress = await WalletService.loadCurrentAccountAddress();
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
  const storedChainId = await WalletRepository.getCurrentChainId();
  const currentChainId = storedChainId !== '' ? storedChainId : 'test3';
  const networks = await ChainRepository.getNetworks();
  const currentNetworkConfig = networks.find((network) => network.chainId === currentChainId) ?? networks[0];

  const gnoClient = GnoClient.createNetworkByType(
    { ...currentNetworkConfig, chainId: currentNetworkConfig.chainId, chainName: currentNetworkConfig.chainName },
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
