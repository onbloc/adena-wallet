import { NetworkMetainfo } from '@states/network';

export type ChainMetainfoResponse = ChainMetainfoItem[];

export interface ChainMetainfoItem {
  id: string;
  default: boolean;
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

export class NetworkMetainfoMapper {
  public static fromChainMetainfoResponse(chainMetainfoResponse: ChainMetainfoResponse) {
    return chainMetainfoResponse.map(this.mappedNetworkMetainfo);
  }

  private static mappedNetworkMetainfo(chainMetainfoItem: ChainMetainfoItem): NetworkMetainfo {
    return {
      ...chainMetainfoItem,
    };
  }
}
