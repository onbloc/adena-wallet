import {
  SearchGRC20Token,
  SearchGRC20TokenResponse,
} from '../response/search-grc20-token-response';
import { GRC20TokenResponse, NativeTokenResponse } from '../response/token-asset-response';

import { GRC20TokenModel, Grc20RouteMap, NativeTokenModel, TokenModel } from '@types';

import { parseGrc20Route } from '@common/utils/grc20-route';

import { toTokenPath } from '@common/utils/grc20-token-path';

export class TokenMapper {
  private static IMAGE_BASE_URI =
    'https://raw.githubusercontent.com/onbloc/gno-token-resource/main';

  public static fromNativeTokenMetainfos(
    networkId: string,
    response: NativeTokenResponse,
  ): NativeTokenModel[] {
    return response.map((token) => {
      const { decimals, denom, image, name, symbol, description, website_url } = token;
      const isGNOT = denom === 'ugnot';
      return {
        main: isGNOT,
        display: isGNOT,
        tokenId: symbol,
        networkId,
        type: 'gno-native',
        name,
        denom,
        symbol,
        decimals,
        description,
        websiteUrl: website_url,
        image: image ? TokenMapper.IMAGE_BASE_URI + image : '',
      };
    });
  }

  public static fromGRC20TokenMetainfos(
    networkId: string,
    response: GRC20TokenResponse,
  ): GRC20TokenModel[] {
    return response.map((token) => {
      const { decimals, pkg_path, image, name, symbol, description, website_url } = token;
      return {
        main: false,
        display: false,
        // Identity is the token key `{packagePath}.{symbol}`, not the bare pkgPath.
        tokenId: toTokenPath(pkg_path, symbol),
        networkId,
        type: 'grc20',
        name,
        pkgPath: pkg_path,
        symbol,
        decimals,
        description,
        websiteUrl: website_url,
        image: image ? TokenMapper.IMAGE_BASE_URI + image : '',
      };
    });
  }

  // Registry key -> route. Entries without `routes` are omitted, which is what
  // makes a consumer fall back to MsgRun.
  public static toGrc20RouteMap(response: GRC20TokenResponse): Grc20RouteMap {
    return response.reduce<Grc20RouteMap>((routes, token) => {
      const route = parseGrc20Route(token.routes);
      if (!route) {
        return routes;
      }
      return { ...routes, [toTokenPath(token.pkg_path, token.symbol)]: route };
    }, {});
  }

  public static fromSearchTokensResponse(
    networkId: string,
    response: SearchGRC20TokenResponse | null,
    tokenInfos?: TokenModel[],
  ): GRC20TokenModel[] {
    if (response === null) {
      return [];
    }
    return response.map((token) => this.mappedMetainfoBySearchToken(networkId, token, tokenInfos));
  }

  private static mappedAddtionalTokenBySearchToken(searchToken: SearchGRC20Token): {
    name: string;
    symbol: string;
    decimals: number;
    tokenId: string;
    path: string;
  } {
    const { name, symbol, decimals, pkg_path: pkgPath } = searchToken;
    return {
      name,
      symbol,
      decimals,
      tokenId: toTokenPath(pkgPath, symbol),
      path: pkgPath,
    };
  }

  private static mappedMetainfoBySearchToken(
    networkId: string,
    searchToken: SearchGRC20Token,
    tokenInfos?: TokenModel[],
  ): GRC20TokenModel {
    const { decimals, name, pkg_path: pkgPath, symbol } = searchToken;
    const tokenId = toTokenPath(pkgPath, symbol);
    const token = tokenInfos && tokenInfos.find((t) => t.tokenId === tokenId);
    return {
      main: false,
      display: false,
      tokenId,
      networkId,
      pkgPath,
      symbol,
      type: 'grc20',
      name,
      decimals,
      image: token?.image ?? '',
    };
  }
}
