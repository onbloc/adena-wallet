import { useRecoilState } from 'recoil';
import { useAdenaContext, useWalletContext } from './use-context';
import { NetworkMetainfo } from '@states/network';
import { NetworkState } from '@states/index';

interface NetworkResponse {
  networks: NetworkMetainfo[];
  currentNetwork: NetworkMetainfo | null;
  changeNetwork: (networkId: string) => Promise<boolean>;
}

export const useNetwork = (): NetworkResponse => {
  const { networkMetainfos: networks } = useWalletContext();
  const { chainService } = useAdenaContext();
  const [currentNetwork, setCurrentNetwork] = useRecoilState(NetworkState.currentNetwork);

  async function changeNetwork(networkId: string) {
    if (networks.length === 0) {
      setCurrentNetwork(null);
      return false;
    }
    const currentNetwork =
      networks.find((network) => network.networkId === networkId) ?? networks[0];
    setCurrentNetwork(currentNetwork);
    await chainService.updateCurrentNetworkId(currentNetwork.networkId);
    return true;
  }

  return {
    networks,
    currentNetwork,
    changeNetwork,
  };
};
