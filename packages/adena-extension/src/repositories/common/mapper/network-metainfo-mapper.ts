import { NetworkMetainfo } from '@states/network';

export interface ChainMetainfoResponse {
  main: boolean;
  chainId: string;
  chainName: string;
  order: number;
  networks: Array<NetworkMetainfoResponse>;
}

interface NetworkMetainfoResponse {
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
  };
}

export class NetworkMetainfoMapper {
  public static fromChainMetainfoResponse(chainMetainfoResponse: ChainMetainfoResponse) {
    return chainMetainfoResponse.networks.map((networkMetainfoResponse) =>
      this.mappedNetworkMetainfo(chainMetainfoResponse, networkMetainfoResponse),
    );
  }

  private static mappedNetworkMetainfo(
    chainMetainfoResponse: ChainMetainfoResponse,
    networkMetainfoResponse: NetworkMetainfoResponse,
  ): NetworkMetainfo {
    return {
      ...networkMetainfoResponse,
      chainId: networkMetainfoResponse.networkId,
      chainName: chainMetainfoResponse.chainName,
      addressPrefix: 'g',
    };
  }
}
