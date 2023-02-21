import { StorageManager } from "@common/storage/storage-manager";

type LocalValueType = 'NETWORKS' | 'CURRENT_CHAIN_ID';

interface Network {
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

  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getNetworks = async () => {
    const networks = await this.localStorage.getToObject<Array<Network>>('NETWORKS');
    return networks;
  };

  public getCurrentNetwork = async () => {
    const networks = await this.localStorage.getToObject<Array<Network>>('NETWORKS');
    const currentChaindId = await this.localStorage.get('CURRENT_CHAIN_ID');
    return networks.find(network => network.chainId === currentChaindId) ?? networks[0];
  };

  public updateNetworks = async (networks: Array<Network>) => {
    await this.localStorage.setByObject('NETWORKS', networks);
  };

  public deleteNetworks = async () => {
    await this.localStorage.remove('NETWORKS');
  };

  public getCurrentChainId = async () => {
    return await this.localStorage.get('CURRENT_CHAIN_ID');
  };

  public updateCurrentChainId = async (chainId: string) => {
    await this.localStorage.set('CURRENT_CHAIN_ID', chainId);
    return true;
  };
}