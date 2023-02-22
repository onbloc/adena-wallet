import { StorageManager } from "@common/storage/storage-manager";
import { AxiosInstance } from "axios";

type LocalValueType = 'NETWORKS' | 'CURRENT_CHAIN_ID';

interface ChainResponse {
  main: boolean;
  chainId: string;
  chainName: string;
  order: number;
  networks: Array<NetworkResponse>;
};

interface NetworkResponse {
  main: boolean;
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
  }
};

export interface Network {
  main: boolean;
  chainId: string;
  chainName: string;
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
  }
};

export class ChainRepository {

  private static CHAIN_URI = "https://raw.githubusercontent.com/onbloc/adena-resource/feature/structure/configs/chains.json";

  private localStorage: StorageManager<LocalValueType>;

  private networkInstance: AxiosInstance;

  constructor(localStorage: StorageManager, networkInstance: AxiosInstance) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
  }

  public fetchNetworks = async () => {
    const response = await this.networkInstance.get<Array<ChainResponse>>(ChainRepository.CHAIN_URI);
    const networks = response.data.find(chain => chain.main)?.networks ?? [];
    const mappedNetworks = networks.map(network => {
      return {
        ...network,
        chainId: network.networkId,
        chainName: network.networkName
      }
    });
    return mappedNetworks;
  };

  public getNetworks = async () => {
    const networks = await this.localStorage.getToObject<Array<Network>>('NETWORKS');
    return networks;
  };

  public updateNetworks = async (networks: Array<Network>) => {
    await this.localStorage.setByObject('NETWORKS', networks);
    return true;
  };

  public deleteNetworks = async () => {
    await this.localStorage.remove('NETWORKS');
    return true;
  };

  public getCurrentChainId = async () => {
    return await this.localStorage.get('CURRENT_CHAIN_ID');
  };

  public updateCurrentChainId = async (chainId: string) => {
    await this.localStorage.set('CURRENT_CHAIN_ID', chainId);
    return true;
  };

  public deleteCurrentChainId = async () => {
    await this.localStorage.remove('CURRENT_CHAIN_ID');
    return true;
  };
}