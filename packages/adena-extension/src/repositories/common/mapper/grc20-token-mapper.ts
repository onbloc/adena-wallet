import { TokenMetainfo } from '@states/token';
import {
  SearchGRC20Token,
  SearchGRC20TokenResponse,
} from '../response/search-grc20-token-response';

export class GRC20TokenMapper {
  public static fromSearchTokensResponse(response: SearchGRC20TokenResponse | null) {
    if (response === null) {
      return [];
    }
    return response.map(this.mappedAddtionalTokenBySearchToken);
  }

  private static mappedAddtionalTokenBySearchToken(searchToken: SearchGRC20Token) {
    const { name, symbol, decimals, pkg_path: pkgPath, chain_id: chainId } = searchToken;
    return {
      name,
      symbol,
      decimals,
      chainId,
      tokenId: pkgPath,
      path: pkgPath,
    };
  }

  private static mappedMetainfoBySearchToken(searchToken: SearchGRC20Token): TokenMetainfo {
    const { chain_id: chainId, decimals, name, pkg_path: pkgPath, symbol } = searchToken;
    return {
      main: false,
      display: false,
      tokenId: pkgPath,
      chainId,
      networkId: chainId,
      pkgPath,
      symbol,
      type: 'GRC20',
      name,
      decimals,
      denom: symbol,
      minimalDenom: symbol,
    };
  }
}
