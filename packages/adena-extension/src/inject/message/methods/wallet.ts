import { WalletError } from '@common/errors';
import { RoutePath } from '@router/path';
import { WalletEstablishService, WalletService } from '@services/index';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { GnoClient } from 'gno-client';
import { WalletAccountRepository, WalletEstablishRepository, WalletRepository } from '@repositories/wallet';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { ChainRepository } from '@repositories/common';
import { AdenaStorage } from '@common/storage';

export const getAccount = async (
  requestData: InjectionMessage,
  sendReponse: (message: any) => void,
) => {
  try {
    const localStorage = AdenaStorage.local();
    const sessionStorage = AdenaStorage.session();
    const walletRepository = new WalletRepository(localStorage, sessionStorage);
    const accountRepository = new WalletAccountRepository(localStorage);
    const walletService = new WalletService(walletRepository, accountRepository);

    const walletPassword = await walletService.loadWalletPassword();
    const wallet = await walletService.loadWalletWithPassword(walletPassword);
    await wallet.initAccounts();
    let currentAccountAddress = await accountRepository.getCurrentAccountAddress();
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
  const localStorage = AdenaStorage.local();
  const sessionStorage = AdenaStorage.session();
  const walletRepository = new WalletRepository(localStorage, sessionStorage);
  const accountRepository = new WalletAccountRepository(localStorage);
  const establishRepository = new WalletEstablishRepository(localStorage);
  const chainRepository = new ChainRepository(localStorage);
  const establishService = new WalletEstablishService(establishRepository, chainRepository);

  const isLocked = await walletRepository.existsWalletPassword();
  const address = await accountRepository.getCurrentAccountAddress();

  const isEstablised = await establishService.isEstablished(message.hostname ?? '', address);
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
  const localStorage = AdenaStorage.local();
  const chainRepository = new ChainRepository(localStorage);

  const storedChainId = await chainRepository.getCurrentChainId();
  const currentChainId = storedChainId !== '' ? storedChainId : 'test3';
  const networks = await chainRepository.getNetworks();
  const currentNetworkConfig = networks.find((network) => network.chainId === currentChainId) ?? networks[0];

  const gnoClient = GnoClient.createNetworkByType(
    { ...currentNetworkConfig, chainId: currentNetworkConfig.chainId, chainName: currentNetworkConfig.chainName },
    getNetworkMapperType(currentChainId),
    fetchAdapter,
  );
  return gnoClient;
}

const getNetworkMapperType = (chainId: string) => {
  switch (chainId) {
    case 'test2':
      return 'TEST2';
    case 'test3':
    default:
      return 'TEST3';
  }
};
