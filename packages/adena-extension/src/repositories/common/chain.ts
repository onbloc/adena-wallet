import { AxiosInstance } from 'axios';

import { StorageManager } from '@common/storage/storage-manager';
import { ChainMetainfoResponse, NetworkMetainfoMapper } from './mapper/network-metainfo-mapper';
import { NetworkMetainfo } from '@types';

type LocalValueType = 'NETWORKS' | 'CURRENT_CHAIN_ID' | 'CURRENT_NETWORK_ID';

export class ChainRepository {
  private static CHAIN_URI = '/resources/chains/chains.json';

  private localStorage: StorageManager<LocalValueType>;

  private networkInstance: AxiosInstance;

  constructor(localStorage: StorageManager, networkInstance: AxiosInstance) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
  }

  public fetchNetworkMetainfos = async (): Promise<NetworkMetainfo[]> => {
    const response = await this.networkInstance.get<ChainMetainfoResponse>(
      ChainRepository.CHAIN_URI,
    );
    return NetworkMetainfoMapper.fromChainMetainfoResponse(response.data);
  };

  public getNetworks = async (): Promise<NetworkMetainfo[]> => {
    const fetchedNetworks = await this.fetchNetworkMetainfos();
    const networks = await this.localStorage
      .getToObject<Array<NetworkMetainfo>>('NETWORKS')
      .then((networks) => (Array.isArray(networks) ? networks : []))
      .catch(() => []);
    if (networks.length === 0) {
      await this.updateNetworks(fetchedNetworks);
      return fetchedNetworks;
    }

    const defaultNetworks = fetchedNetworks.filter(
      (network) =>
        network.default || networks?.find((current) => current.id === network.id) === undefined,
    );
    const customNetworks = networks.filter((network) => network.default === false);
    return [...defaultNetworks, ...customNetworks];
  };

  public addNetwork = async (network: NetworkMetainfo): Promise<boolean> => {
    const networks = await this.getNetworks();
    await this.updateNetworks([...networks, network]);
    return true;
  };

  public updateNetworks = async (networks: Array<NetworkMetainfo>): Promise<boolean> => {
    await this.localStorage.setByObject('NETWORKS', networks);
    return true;
  };

  public deleteNetworks = async (): Promise<boolean> => {
    await this.localStorage.remove('NETWORKS');
    return true;
  };

  public getCurrentChainId = (): Promise<string> => {
    return this.localStorage.get('CURRENT_CHAIN_ID');
  };

  public updateCurrentChainId = async (chainId: string): Promise<boolean> => {
    await this.localStorage.set('CURRENT_CHAIN_ID', chainId);
    return true;
  };

  public deleteCurrentChainId = async (): Promise<boolean> => {
    await this.localStorage.remove('CURRENT_CHAIN_ID');
    return true;
  };

  public getCurrentNetworkId = (): Promise<string> => {
    return this.localStorage.get('CURRENT_NETWORK_ID');
  };

  public updateCurrentNetworkId = async (networkId: string): Promise<boolean> => {
    await this.localStorage.set('CURRENT_NETWORK_ID', networkId);
    return true;
  };

  public deleteCurrentNetworkId = async (): Promise<boolean> => {
    await this.localStorage.remove('CURRENT_NETWORK_ID');
    return true;
  };
}
