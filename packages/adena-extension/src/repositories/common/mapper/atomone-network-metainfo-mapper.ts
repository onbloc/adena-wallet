import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import { AtomoneNetworkMetainfo } from '@types';

export type AtomoneMetainfoResponse = AtomoneMetainfoItem[];

/**
 * Shape of a single entry in atomone-chains.json. The resource files use
 * `main`/`apiUrl` so that the Gno and AtomOne chain resources share one
 * field naming, while AtomoneNetworkMetainfo keeps the `isMainnet`/`restUrl`
 * names the cosmos-side consumers expect.
 */
export interface AtomoneMetainfoItem {
  id: string;
  default: boolean;
  main: boolean;
  chainGroup: 'atomone';
  chainType: 'cosmos';
  chainId: string;
  chainName: string;
  networkId: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  apiUrl: string;
  linkUrl?: string;
}

export class AtomoneNetworkMetainfoMapper {
  public static fromResponse(response: AtomoneMetainfoResponse): AtomoneNetworkMetainfo[] {
    return response.map(AtomoneNetworkMetainfoMapper.mappedMetainfo);
  }

  /**
   * Loads the bundled atomone-chains.json into the metainfo shape. Callers that
   * import the resource directly (recoil defaults, offline fallbacks) must use
   * this instead of casting the raw JSON, which would leave `isMainnet` and
   * `restUrl` undefined at runtime.
   */
  public static fromResource(): AtomoneNetworkMetainfo[] {
    return AtomoneNetworkMetainfoMapper.fromResponse(
      ATOMONE_CHAIN_DATA as AtomoneMetainfoResponse,
    );
  }

  private static mappedMetainfo(item: AtomoneMetainfoItem): AtomoneNetworkMetainfo {
    return {
      id: item.id,
      default: item.default,
      isMainnet: item.main,
      chainGroup: item.chainGroup,
      chainType: item.chainType,
      chainId: item.chainId,
      chainName: item.chainName,
      networkId: item.networkId,
      networkName: item.networkName,
      addressPrefix: item.addressPrefix,
      rpcUrl: item.rpcUrl,
      restUrl: item.apiUrl,
      linkUrl: item.linkUrl,
      deleted: false,
    };
  }
}
