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
  changeNetwork: (networkId: string) => Promise<boolean>;
  addNetwork: (name: string, rpcUrl: string, chainId: string) => void;
}

const DEFAULT_NETWORK: NetworkMetainfo = {
  id: 'test3',
  default: true,
  chainId: 'GNOLAND',
  chainName: 'GNO.LAND',
  networkId: 'test3',
  networkName: 'Testnet 3',
  addressPrefix: 'g',
  rpcUrl: 'https://rpc.test3.gno.land',
  gnoUrl: 'https://test3.gno.land',
  apiUrl: 'https://api.adena.app',
  linkUrl: 'https://gnoscan.io',
  token: {
    denom: 'gnot',
    unit: 1,
    minimalDenom: 'ugnot',
    minimalUnit: 0.000001,
  },
};

export const useNetwork = (): NetworkResponse => {
  const { dispatchEvent } = useEvent();
  const { changeNetwork: changeNetworkProvider } = useWalletContext();
  const [networkMetainfos, setNetworkMetainfos] = useRecoilState(NetworkState.networkMetainfos);
  const { chainService } = useAdenaContext();
  const [currentNetwork, setCurrentNetwork] = useRecoilState(NetworkState.currentNetwork);

  async function changeNetwork(id: string) {
    if (networkMetainfos.length === 0) {
      setCurrentNetwork(null);
      return false;
    }
    const network = networkMetainfos.find((network) => network.id === id) ?? networkMetainfos[0];
    await chainService.updateCurrentNetworkId(id);
    const changedNetwork = await changeNetworkProvider(network);
    dispatchChangedEvent(changedNetwork);
    return true;
  }

  const addNetwork = useCallback(async (name: string, rpcUrl: string, chainId: string) => {
    const changedRpcUrl = rpcUrl.endsWith('/') ? rpcUrl.substring(0, rpcUrl.length - 1) : rpcUrl;
    await chainService.addGnoNetwork(name, changedRpcUrl, chainId);
    const networkMetainfos = await chainService.getNetworks();
    setNetworkMetainfos(networkMetainfos);
  }, []);

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
    addNetwork,
  };
};
