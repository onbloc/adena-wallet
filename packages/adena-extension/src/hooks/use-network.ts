import { useCallback } from 'react';
import { useRecoilState, useResetRecoilState } from 'recoil';

import { useAdenaContext, useWalletContext } from './use-context';
import { EventMessage } from '@inject/message';
import { useEvent } from './use-event';
import { fetchHealth } from '@common/utils/fetch-utils';

import { NetworkMetainfo } from '@types';
import { BalanceState, NetworkState, WalletState } from '@states';
import { useQuery } from '@tanstack/react-query';
import CHAIN_DATA from '@resources/chains/chains.json';

interface NetworkResponse {
  networks: NetworkMetainfo[];
  currentNetwork: NetworkMetainfo;
  modified: boolean;
  failedNetwork: boolean | null;
  getDefaultNetworkInfo: (networkId: string) => NetworkMetainfo | null;
  checkNetworkState: () => Promise<void>;
  addNetwork: (name: string, rpcUrl: string, chainId: string) => void;
  changeNetwork: (networkId: string) => Promise<boolean>;
  updateNetwork: (network: NetworkMetainfo) => Promise<boolean>;
  deleteNetwork: (networkId: string) => Promise<boolean>;
  setModified: (modified: boolean) => void;
}

const DEFAULT_NETWORK: NetworkMetainfo = CHAIN_DATA[0];

export const useNetwork = (): NetworkResponse => {
  const { dispatchEvent } = useEvent();
  const { changeNetwork: changeNetworkProvider } = useWalletContext();
  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);
  const { chainService } = useAdenaContext();
  const [currentNetwork, setCurrentNetwork] = useRecoilState(NetworkState.currentNetwork);
  const [modified, setModified] = useRecoilState(NetworkState.modified);
  const [, setState] = useRecoilState(WalletState.state);
  const resetAccountTokenBalances = useResetRecoilState(BalanceState.accountTokenBalances);
  const resetAccountNativeBalances = useResetRecoilState(BalanceState.accountNativeBalances);
  const resetCurrentTokenBalances = useResetRecoilState(BalanceState.currentTokenBalances);

  const { data: failedNetwork = null, refetch: refetchNetworkState } = useQuery<boolean | null>(
    ['network/failedNetwork', currentNetwork],
    () => {
      if (!currentNetwork) {
        return null;
      }
      return fetchHealth(currentNetwork.rpcUrl).then(({ healthy }) => !healthy);
    },
  );

  const getDefaultNetworkInfo = useCallback((networkId: string) => {
    const network = CHAIN_DATA.find(
      (current) => current.default && current.networkId === networkId,
    );
    if (!network) {
      return null;
    }
    return network;
  }, []);

  const checkNetworkState = async (): Promise<void> => {
    await refetchNetworkState();
  };

  const addNetwork = useCallback(
    async (name: string, rpcUrl: string, chainId: string) => {
      setModified(true);
      const changedRpcUrl = rpcUrl.endsWith('/') ? rpcUrl.substring(0, rpcUrl.length - 1) : rpcUrl;
      const parsedName = name.trim();
      await chainService.addGnoNetwork(parsedName, changedRpcUrl, chainId);
      const networkMetainfos = await chainService.getNetworks();
      setNetworkMetainfos(networkMetainfos);
    },
    [networkMetainfos, chainService],
  );

  const changeNetworkOfProvider = useCallback(
    async (network: NetworkMetainfo) => {
      const changedNetwork = await changeNetworkProvider(network);
      dispatchChangedEvent(changedNetwork);
    },
    [changeNetworkProvider],
  );

  const changeNetwork = useCallback(
    async (id: string) => {
      if (networkMetainfos.length === 0) {
        setCurrentNetwork(null);
        return false;
      }
      resetCurrentTokenBalances();
      resetAccountTokenBalances();
      resetAccountNativeBalances();
      setState('LOADING');
      const network = networkMetainfos.find((network) => network.id === id) ?? networkMetainfos[0];
      await chainService.updateCurrentNetworkId(id);
      await changeNetworkOfProvider(network);
      return true;
    },
    [networkMetainfos, changeNetworkOfProvider],
  );

  const updateNetwork = useCallback(
    async (network: NetworkMetainfo) => {
      setModified(true);
      const changedNetworks = networkMetainfos.map((current) =>
        network.id === current.id ? network : current,
      );
      await chainService.updateNetworks(changedNetworks);
      setNetworkMetainfos(changedNetworks);

      if (network.id === currentNetwork?.id) {
        changeNetworkOfProvider(network);
      }
      return true;
    },
    [currentNetwork, networkMetainfos, chainService],
  );

  const deleteNetwork = useCallback(
    async (networkId: string) => {
      const network = networkMetainfos.find((current) => current.id === networkId);
      if (!network) {
        return false;
      }
      setModified(true);
      const changedNetworks =
        network.default || network.id === 'teritori'
          ? networkMetainfos.map((current) =>
              current.id === network.id ? { ...current, deleted: true } : current,
            )
          : networkMetainfos.filter((current) => current.id !== networkId);
      await chainService.updateNetworks(changedNetworks);
      setNetworkMetainfos(changedNetworks);

      if (networkId === currentNetwork?.id) {
        changeNetworkOfProvider(DEFAULT_NETWORK);
      }
      return true;
    },
    [currentNetwork, networkMetainfos, chainService, currentNetwork],
  );

  const dispatchChangedEvent = useCallback(
    (network: NetworkMetainfo) => {
      const message = EventMessage.event('changedNetwork', network.networkId);
      dispatchEvent(message);
    },
    [currentNetwork],
  );

  return {
    currentNetwork: currentNetwork || DEFAULT_NETWORK,
    networks: networkMetainfos,
    modified,
    failedNetwork,
    getDefaultNetworkInfo,
    checkNetworkState,
    changeNetwork,
    updateNetwork,
    addNetwork,
    deleteNetwork,
    setModified,
  };
};
