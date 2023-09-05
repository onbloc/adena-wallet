import { useRecoilState } from 'recoil';
import { useAdenaContext, useWalletContext } from './use-context';
import { NetworkMetainfo } from '@states/network';
import { NetworkState } from '@states/index';
import { EventMessage } from '@inject/message';
import { useCallback } from 'react';
import { useEvent } from './use-event';

interface NetworkResponse {
  networks: NetworkMetainfo[];
  currentNetwork: NetworkMetainfo;
  modified: boolean;
  addNetwork: (name: string, rpcUrl: string, chainId: string) => void;
  changeNetwork: (networkId: string) => Promise<boolean>;
  updateNetwork: (network: NetworkMetainfo) => Promise<boolean>;
  deleteNetwork: (networkId: string) => Promise<boolean>;
  setModified: (modified: boolean) => void;
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
      const network = networkMetainfos.find((network) => network.id === id) ?? networkMetainfos[0];
      await chainService.updateCurrentNetworkId(id);
      changeNetworkOfProvider(network);
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
  };
};
