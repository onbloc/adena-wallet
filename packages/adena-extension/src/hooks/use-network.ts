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
  addNetwork: (name: string, rpcUrl: string, chainId: string) => void;
  changeNetwork: (networkId: string) => Promise<boolean>;
  updateNetwork: (network: NetworkMetainfo) => Promise<boolean>;
  deleteNetwork: (networkId: string) => Promise<boolean>;
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

  const addNetwork = useCallback(
    async (name: string, rpcUrl: string, chainId: string) => {
      const changedRpcUrl = rpcUrl.endsWith('/') ? rpcUrl.substring(0, rpcUrl.length - 1) : rpcUrl;
      await chainService.addGnoNetwork(name, changedRpcUrl, chainId);
      const networkMetainfos = await chainService.getNetworks();
      setNetworkMetainfos(networkMetainfos);
    },
    [networkMetainfos, chainService],
  );

  const changeNetwork = useCallback(
    async (id: string) => {
      if (networkMetainfos.length === 0) {
        setCurrentNetwork(null);
        return false;
      }
      const network = networkMetainfos.find((network) => network.id === id) ?? networkMetainfos[0];
      await chainService.updateCurrentNetworkId(id);
      const changedNetwork = await changeNetworkProvider(network);
      dispatchChangedEvent(changedNetwork);
      return true;
    },
    [chainService, networkMetainfos, chainService],
  );

  const updateNetwork = useCallback(
    async (network: NetworkMetainfo) => {
      const changedNetworks = networkMetainfos.map((current) =>
        network.id === current.id ? network : current,
      );
      await chainService.updateNetworks(changedNetworks);
      setNetworkMetainfos(changedNetworks);
      if (network.id === currentNetwork?.id) {
        await changeNetwork(network.id);
      }
      return true;
    },
    [networkMetainfos, chainService, changeNetwork],
  );

  const deleteNetwork = useCallback(
    async (networkId: string) => {
      const changedNetworks = networkMetainfos.filter((current) => current.id !== networkId);
      await chainService.updateNetworks(changedNetworks);
      setNetworkMetainfos(changedNetworks);
      if (networkId === currentNetwork?.id) {
        await changeNetwork(DEFAULT_NETWORK.id);
      }
      return true;
    },
    [networkMetainfos, chainService, currentNetwork],
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
    changeNetwork,
    updateNetwork,
    addNetwork,
    deleteNetwork,
  };
};
