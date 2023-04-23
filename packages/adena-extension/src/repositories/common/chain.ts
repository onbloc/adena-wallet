import { StorageManager } from '@common/storage/storage-manager';
import { AxiosInstance } from 'axios';
import { ChainMetainfoResponse, NetworkMetainfoMapper } from './mapper/network-metainfo-mapper';
import { NetworkMetainfo } from '@states/network';

type LocalValueType = 'NETWORKS' | 'CURRENT_CHAIN_ID' | 'CURRENT_NETWORK_ID';

export interface Network {
  main: boolean;
  chainId: string;
  chainName: string;
  networkId: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  gnoUrl: string;
  apiUrl: string;
  linkUrl: string;
  token: {
    denom: string;
    unit: number;
    minimalDenom: string;
    minimalUnit: number;
  };
}

export class ChainRepository {
  private static CHAIN_URI =
    'https://raw.githubusercontent.com/onbloc/adena-resource/main/configs/chains.json';

  private localStorage: StorageManager<LocalValueType>;

  private networkInstance: AxiosInstance;

  constructor(localStorage: StorageManager, networkInstance: AxiosInstance) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
  }

  public fetchNetworkMetainfos = async () => {
    const response = await this.networkInstance.get<Array<ChainMetainfoResponse>>(
      ChainRepository.CHAIN_URI,
    );
    const chain = response.data.find((chain) => chain.main);
    if (!chain) {
      return [];
    }
    return NetworkMetainfoMapper.fromChainMetainfoResponse(chain);
  };

  public fetchNetworks = async () => {
    const response = await this.networkInstance.get<Array<ChainMetainfoResponse>>(
      ChainRepository.CHAIN_URI,
    );
    const chain = response.data.find((chain) => chain.main);
    if (!chain) {
      return [];
    }
    return NetworkMetainfoMapper.fromChainMetainfoResponse(chain);
  };

  public getNetworks = async () => {
    const networks = await this.localStorage.getToObject<Array<Network>>('NETWORKS');
    return networks;
  };

  public updateNetworks = async (networks: Array<NetworkMetainfo>) => {
    await this.localStorage.setByObject('NETWORKS', networks);
    return true;
  };

  public deleteNetworks = async () => {
    await this.localStorage.remove('NETWORKS');
    return true;
  };

  public getCurrentChainId = () => {
    return this.localStorage.get('CURRENT_CHAIN_ID');
  };

  public updateCurrentChainId = async (chainId: string) => {
    await this.localStorage.set('CURRENT_CHAIN_ID', chainId);
    return true;
  };

  public deleteCurrentChainId = async () => {
    await this.localStorage.remove('CURRENT_CHAIN_ID');
    return true;
  };

  public getCurrentNetworkId = () => {
    return this.localStorage.get('CURRENT_NETWORK_ID');
  };

  public updateCurrentNetworkId = async (networkId: string) => {
    await this.localStorage.set('CURRENT_NETWORK_ID', networkId);
    return true;
  };

  public deleteCurrentNetworkId = async () => {
    await this.localStorage.remove('CURRENT_NETWORK_ID');
    return true;
  };
}
