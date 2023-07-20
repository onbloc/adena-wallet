import {
  GRC20TokenModel,
  IBCNativeTokenModel,
  IBCTokenModel,
  NativeTokenModel,
  TokenModel,
} from '@models/token-model';
import {
  SearchGRC20Token,
  SearchGRC20TokenResponse,
} from '../response/search-grc20-token-response';
import {
  GRC20TokenResponse,
  IBCNativeTokenResponse,
  IBCTokenResponse,
  NativeTokenResponse,
} from '../response/token-asset-response';

export class TokenMapper {
  private static IMAGE_BASE_URI =
    'https://raw.githubusercontent.com/onbloc/gno-token-resource/main';

  public static fromNativeTokenMetainfos(response: NativeTokenResponse): NativeTokenModel[] {
    return response.map((token) => {
      const { decimals, denom, image, name, symbol, description, website_url } = token;
      const isGNOT = symbol === 'GNOT';
      return {
        main: isGNOT,
        display: isGNOT,
        tokenId: symbol,
        type: 'gno-native',
        name,
        denom,
        symbol,
        decimals,
        description,
        websiteUrl: website_url,
        image: TokenMapper.IMAGE_BASE_URI + image,
      };
    });
  }

  public static fromGRC20TokenMetainfos(response: GRC20TokenResponse): GRC20TokenModel[] {
    return response.map((token) => {
      const { decimals, pkg_path, image, name, symbol, description, website_url } = token;
      return {
        main: false,
        display: false,
        tokenId: pkg_path,
        type: 'grc20',
        name,
        pkgPath: pkg_path,
        symbol,
        decimals,
        description,
        websiteUrl: website_url,
        image: TokenMapper.IMAGE_BASE_URI + image,
      };
    });
  }

  public static fromIBCNativeMetainfos(response: IBCNativeTokenResponse): IBCNativeTokenModel[] {
    return response.map((token) => {
      const { decimals, denom, image, name, symbol, description, website_url } = token;
      return {
        main: false,
        display: false,
        tokenId: symbol,
        type: 'ibc-native',
        name,
        denom,
        symbol,
        decimals,
        description,
        websiteUrl: website_url,
        image: TokenMapper.IMAGE_BASE_URI + image,
      };
    });
  }

  public static fromIBCTokenMetainfos(response: IBCTokenResponse): IBCTokenModel[] {
    return response.map((token) => {
      const { website_url, origin_chain, origin_denom, origin_type, symbol } = token;
      return {
        main: false,
        display: false,
        tokenId: symbol,
        websiteUrl: website_url,
        type: 'ibc-tokens',
        originChain: origin_chain,
        originDenom: origin_denom,
        originType: origin_type,
        ...token,
      };
    });
  }

  public static fromSearchTokensResponse(
    response: SearchGRC20TokenResponse | null,
    tokenInfos?: TokenModel[],
  ) {
    if (response === null) {
      return [];
    }
    return response.map((token) => this.mappedMetainfoBySearchToken(token, tokenInfos));
  }

  private static mappedAddtionalTokenBySearchToken(searchToken: SearchGRC20Token) {
    const { name, symbol, decimals, pkg_path: pkgPath } = searchToken;
    return {
      name,
      symbol,
      decimals,
      tokenId: pkgPath,
      path: pkgPath,
    };
  }

  private static mappedMetainfoBySearchToken(
    searchToken: SearchGRC20Token,
    tokenInfos?: TokenModel[],
  ): GRC20TokenModel {
    const token = tokenInfos && tokenInfos.find((t) => t.tokenId === pkgPath);
    const { decimals, name, pkg_path: pkgPath, symbol } = searchToken;
    return {
      main: false,
      display: false,
      tokenId: pkgPath,
      pkgPath,
      symbol,
      type: 'grc20',
      name,
      decimals,
      image: token?.image ?? '',
    };
  }
}
