import { WalletResponseFailureType, WalletResponseRejectType } from '@adena-wallet/sdk';
import { NetworkMetainfo, RoutePath } from '@types';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

function matchChainId(network: NetworkMetainfo, chainId: string): boolean {
  return network.chainId === chainId;
}
function matchRPCUrl(network: NetworkMetainfo, rpcUrl: string): boolean {
  return network.rpcUrl === rpcUrl.replace(/\/$/, '');
}

export const addNetwork = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  const core = new InjectCore();
  const locked = await core.walletService.isLocked();
  const data = requestData.data;
  if (!locked) {
    const chainId = data?.chainId || '';
    const chainName = data?.chainName || '';
    const rpcUrl = data?.rpcUrl || '';
    if (chainId === '' || chainName === '' || rpcUrl === '') {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.INVALID_FORMAT,
          {},
          requestData.key,
        ),
      );
      return;
    }
    if (rpcUrl.match(/\s/g)) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.INVALID_FORMAT,
          {},
          requestData.key,
        ),
      );
      return;
    }
    const networks = await core.chainService.getNetworks();
    const existNetwork =
      networks.findIndex(
        (current) =>
          (matchChainId(current, chainId) || matchRPCUrl(current, rpcUrl)) &&
          current.deleted !== true,
      ) > -1;
    if (existNetwork) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.NETWORK_ALREADY_EXISTS,
          {},
          requestData.key,
        ),
      );
      return;
    }

    HandlerMethod.createPopup(
      RoutePath.ApproveAddingNetwork,
      requestData,
      InjectionMessageInstance.failure(
        WalletResponseRejectType.ADD_NETWORK_REJECTED,
        {},
        requestData.key,
      ),
      sendResponse,
    );
  } else {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.WALLET_LOCKED,
        {},
        requestData.key,
      ),
    );
  }
};

export const switchNetwork = async (
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  const core = new InjectCore();
  const locked = await core.walletService.isLocked();
  if (locked) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.WALLET_LOCKED,
        {},
        requestData.key,
      ),
    );
    return;
  }
  const chainId = requestData.data?.chainId || '';
  if (chainId === '') {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.INVALID_FORMAT,
        {},
        requestData.key,
      ),
    );
    return;
  }
  const currentNetwork = await core.chainService.getCurrentNetwork();
  if (currentNetwork.networkId === chainId) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.REDUNDANT_CHANGE_REQUEST,
        requestData?.data,
        requestData?.key,
      ),
    );
    return;
  }
  const networks = await core.chainService.getNetworks();
  const existNetwork =
    networks.findIndex((current) => current.chainId === chainId && current.deleted !== true) > -1;
  if (!existNetwork) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.UNADDED_NETWORK,
        {},
        requestData.key,
      ),
    );
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveChangingNetwork,
    requestData,
    InjectionMessageInstance.failure(
      WalletResponseRejectType.SWITCH_NETWORK_REJECTED,
      {},
      requestData.key,
    ),
    sendResponse,
  );
};
