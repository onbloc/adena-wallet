import { StorageManager } from '@common/storage/storage-manager';
import { AxiosInstance } from 'axios';
import { ChainMetainfoResponse, NetworkMetainfoMapper } from './mapper/network-metainfo-mapper';
import { NetworkMetainfo } from '@states/network';

type LocalValueType = 'NETWORKS' | 'CURRENT_CHAIN_ID' | 'CURRENT_NETWORK_ID';

const defaultNetworks: NetworkMetainfo[] = [
  {
    id: 'test3',
    main: true,
    chainId: 'test3',
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
  },
  {
    id: 'test2',
    main: false,
    chainId: 'test2',
    chainName: 'GNO.LAND',
    networkId: 'test2',
    networkName: 'Testnet 2',
    addressPrefix: 'g',
    rpcUrl: 'https://rpc.test2.gno.land',
    gnoUrl: 'https://test2.gno.land',
    apiUrl: 'https://api.adena.app',
    linkUrl: 'https://test2.gnoscan.io',
    token: {
      denom: 'gnot',
      unit: 1,
      minimalDenom: 'ugnot',
      minimalUnit: 0.000001,
    },
  },
  {
    id: 'dev',
    main: false,
    chainId: 'dev',
    chainName: 'GNO.LAND',
    networkId: 'dev',
    networkName: 'Local',
    addressPrefix: 'g',
    rpcUrl: 'http://127.0.0.1:26657',
    gnoUrl: 'http://127.0.0.1:8888',
    apiUrl: 'http://127.0.0.1:8080',
    linkUrl: 'http://127.0.0.1:80',
    token: {
      denom: 'gnot',
      unit: 1,
      minimalDenom: 'ugnot',
      minimalUnit: 0.000001,
    },
  },
];

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

  public getNetworks = async () => {
    const networks = await this.localStorage
      .getToObject<Array<NetworkMetainfo>>('NETWORKS')
      .catch(() => []);
    if (networks.length === 0) {
      await this.updateNetworks(defaultNetworks);
      return defaultNetworks;
    }
    return networks;
  };

  public addNetwork = async (network: NetworkMetainfo) => {
    const networks = await this.getNetworks();
    await this.updateNetworks([...networks, network]);
    return true;
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
