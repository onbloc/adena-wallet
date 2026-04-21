import { AtomoneNetworkMetainfo } from '@types';

export type AtomoneMetainfoResponse = AtomoneMetainfoItem[];

export interface AtomoneMetainfoItem {
  id: string;
  default: boolean;
  isMainnet: boolean;
  chainGroup: 'atomone';
  chainType: 'cosmos';
  chainId: string;
  chainName: string;
  networkId: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  restUrl: string;
  linkUrl?: string;
}

export class AtomoneNetworkMetainfoMapper {
  public static fromResponse(
    response: AtomoneMetainfoResponse,
  ): AtomoneNetworkMetainfo[] {
    return response.map(AtomoneNetworkMetainfoMapper.mappedMetainfo);
  }

  private static mappedMetainfo(item: AtomoneMetainfoItem): AtomoneNetworkMetainfo {
    return {
      ...item,
      deleted: false,
    };
  }
}
