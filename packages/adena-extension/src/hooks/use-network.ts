import { useCallback } from 'react';
import { useRecoilState, useResetRecoilState } from 'recoil';

import { useAdenaContext, useWalletContext } from './use-context';
import { EventMessage } from '@inject/message';
import { useEvent } from './use-event';
import { fetchHealth } from '@common/utils/client-utils';

import { NetworkMetainfo } from '@types';
import { CommonState, NetworkState, WalletState } from '@states';

interface NetworkResponse {
  networks: NetworkMetainfo[];
  currentNetwork: NetworkMetainfo;
  modified: boolean;
  addNetwork: (name: string, rpcUrl: string, chainId: string) => void;
  changeNetwork: (networkId: string) => Promise<boolean>;
  updateNetwork: (network: NetworkMetainfo) => Promise<boolean>;
  deleteNetwork: (networkId: string) => Promise<boolean>;
  setModified: (modified: boolean) => void;
  resetNetworkConnection: () => void;
}

const DEFAULT_NETWORK: NetworkMetainfo = {
  id: 'test3',
  default: true,
  main: true,
  chainId: 'GNOLAND',
  chainName: 'GNO.LAND',
  networkId: 'test3',
  networkName: 'Testnet 3',
  addressPrefix: 'g',
  rpcUrl: 'https://rpc.test3.gno.land',
  gnoUrl: 'https://test3.gno.land',
  apiUrl: 'https://api.adena.app',
  linkUrl: 'https://gnoscan.io',
};

export const useNetwork = (): NetworkResponse => {
  const { dispatchEvent } = useEvent();
  const { changeNetwork: changeNetworkProvider } = useWalletContext();
  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);
  const { chainService } = useAdenaContext();
  const [currentNetwork, setCurrentNetwork] = useRecoilState(NetworkState.currentNetwork);
  const [modified, setModified] = useRecoilState(NetworkState.modified);
  const [failedNetwork, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);
  const [, setState] = useRecoilState(WalletState.state);
  const resetNetworkConnection = useResetRecoilState(CommonState.failedNetwork);

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
      let currentHealthy = false;
      await fetchHealth(network.rpcUrl).then(({ healthy }) => {
        currentHealthy = healthy;
      });
      setFailedNetwork({ ...failedNetwork, [network.id]: !currentHealthy });
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
      setState('LOADING');
      resetNetworkConnection();
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
    changeNetwork,
    updateNetwork,
    addNetwork,
    deleteNetwork,
    setModified,
    resetNetworkConnection,
  };
};
