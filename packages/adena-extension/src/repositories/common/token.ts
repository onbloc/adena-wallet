import { AxiosInstance } from 'axios';

import { StorageManager } from '@common/storage/storage-manager';
import {
  GRC20TokenResponse,
  IBCNativeTokenResponse,
  IBCTokenResponse,
  NativeTokenResponse,
} from './response/token-asset-response';
import { TokenMapper } from './mapper/token-mapper';

import {
  NativeTokenModel,
  GRC20TokenModel,
  IBCNativeTokenModel,
  IBCTokenModel,
  TokenModel,
  NetworkMetainfo,
} from '@types';
import { makeAllRealmsQuery } from './token.queries';
import { mapGRC20TokenModel } from './mapper/token-query.mapper';
import { makeRPCRequest } from '@common/utils/fetch-utils';

type LocalValueType = 'ACCOUNT_TOKEN_METAINFOS';

const DEFAULT_TOKEN_NETWORK_ID = 'DEFAULT';

const DEFAULT_TOKEN_METAINFOS: NativeTokenModel[] = [
  {
    main: true,
    tokenId: 'Gnoland',
    name: 'Gnoland',
    networkId: DEFAULT_TOKEN_NETWORK_ID,
    image:
      'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    symbol: 'GNOT',
    denom: 'ugnot',
    type: 'gno-native',
    decimals: 6,
    display: true,
  },
];

export interface AppInfoResponse {
  symbol: string;
  name: string;
  description: string;
  logo: string;
  link: string;
  display: boolean;
  order: number;
}

export class TokenRepository {
  private static GNO_TOKEN_RESOURCE_URI =
    'https://raw.githubusercontent.com/onbloc/gno-token-resource/main';

  private static APP_INFO_URI = '/resources/apps/apps.json';

  private localStorage: StorageManager<LocalValueType>;

  private networkInstance: AxiosInstance;

  private networkMetainfo: NetworkMetainfo | null;

  constructor(
    localStorage: StorageManager,
    networkInstance: AxiosInstance,
    networkMetainfo: NetworkMetainfo | null,
  ) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
    this.networkMetainfo = networkMetainfo;
  }

  private get networkId(): string {
    return this.networkMetainfo?.networkId || '';
  }

  public get supported(): boolean {
    return !!this.networkMetainfo?.apiUrl || !!this.networkMetainfo?.indexerUrl;
  }

  public get apiUrl(): string | null {
    if (!this.networkMetainfo?.apiUrl) {
      return null;
    }
    return this.networkMetainfo.apiUrl + '/v1';
  }

  public get queryUrl(): string | null {
    if (!this.networkMetainfo?.indexerUrl) {
      return null;
    }
    return this.networkMetainfo.indexerUrl + '/graphql/query';
  }

  public setNetworkMetainfo(networkMetainfo: NetworkMetainfo): void {
    this.networkMetainfo = networkMetainfo;
  }

  public fetchTokenMetainfos = async (): Promise<TokenModel[]> => {
    if (!this.networkId) {
      return [];
    }

    return Promise.all([
      this.fetchNativeTokenAssets(),
      this.fetchGRC20TokenAssets(),
      // this.fetchIBCNativeTokenAssets(),
      // this.fetchIBCTokenAssets(),
    ]).then((data) => data.flat());
  };

  public fetchAppInfos = async (): Promise<Array<AppInfoResponse>> => {
    const apps = await fetch(TokenRepository.APP_INFO_URI);
    return apps.json();
  };

  public getAccountTokenMetainfos = async (accountId: string): Promise<TokenModel[]> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<{
      [key in string]: TokenModel[];
    }>('ACCOUNT_TOKEN_METAINFOS');

    return accountTokenMetainfos[accountId] ?? [];
  };

  public updateTokenMetainfos = async (
    accountId: string,
    tokenMetainfos: TokenModel[],
  ): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<{
      [key in string]: TokenModel[];
    }>('ACCOUNT_TOKEN_METAINFOS');

    const isUnique = function (token0: TokenModel, token1: TokenModel): boolean {
      return token0.tokenId === token1.tokenId && token0.networkId === token1.networkId;
    };

    const filteredTokenMetainfos = tokenMetainfos.filter((info1, index) => {
      return tokenMetainfos.findIndex((info2) => isUnique(info1, info2)) === index;
    });

    const changedAccountTokenMetainfos = {
      ...accountTokenMetainfos,
      [accountId]: filteredTokenMetainfos,
    };

    await this.localStorage.setByObject('ACCOUNT_TOKEN_METAINFOS', changedAccountTokenMetainfos);
    return true;
  };

  public deleteTokenMetainfos = async (accountId: string): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<{
      [key in string]: TokenModel[];
    }>('ACCOUNT_TOKEN_METAINFOS');

    const changedAccountTokenMetainfos = {
      ...accountTokenMetainfos,
      [accountId]: [],
    };

    await this.localStorage.setByObject('ACCOUNT_TOKEN_METAINFOS', changedAccountTokenMetainfos);
    return true;
  };

  public deleteAllTokenMetainfo = async (): Promise<boolean> => {
    await this.localStorage.setByObject('ACCOUNT_TOKEN_METAINFOS', {});
    return true;
  };

  public fetchAllGRC20Tokens = async (): Promise<GRC20TokenModel[]> => {
    if (this.apiUrl) {
      const tokens = await TokenRepository.postRPCRequest<{
        result: {
          name: string;
          owner: string;
          symbol: string;
          packagePath: string;
          decimals: number;
        }[];
      }>(
        this.networkInstance,
        this.apiUrl + '/gno',
        makeRPCRequest({
          method: 'getGRC20Tokens',
        }),
      ).then((data) => data?.result || []);

      return tokens.map((token) => ({
        main: false,
        tokenId: token.packagePath,
        pkgPath: token.packagePath,
        networkId: this.networkId,
        display: false,
        type: 'grc20',
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        image: '',
      }));
    }

    if (!this.queryUrl) {
      return [];
    }

    const allRealmsQuery = makeAllRealmsQuery();
    return TokenRepository.postGraphQuery(this.networkInstance, this.queryUrl, allRealmsQuery).then(
      (result) =>
        result?.data?.transactions
          ? result?.data?.transactions
              .flatMap((tx: any) => tx.messages)
              .map((message: any) =>
                mapGRC20TokenModel(this.networkMetainfo?.networkId || '', message),
              )
          : [],
    );
  };

  private fetchNativeTokenAssets = async (): Promise<NativeTokenModel[]> => {
    const requestUri =
      TokenRepository.GNO_TOKEN_RESOURCE_URI + `/gno-native/${this.networkId}.json`;
    return this.networkInstance
      .get<NativeTokenResponse>(requestUri)
      .then((response) => TokenMapper.fromNativeTokenMetainfos(this.networkId, response.data))
      .catch(() =>
        DEFAULT_TOKEN_METAINFOS.map((token) => ({ ...token, networkId: this.networkId })),
      );
  };

  private fetchGRC20TokenAssets = async (): Promise<GRC20TokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + `/grc20/${this.networkId}.json`;
    return this.networkInstance
      .get<GRC20TokenResponse>(requestUri)
      .then((response) => TokenMapper.fromGRC20TokenMetainfos(this.networkId, response.data))
      .catch(() => []);
  };

  private fetchIBCNativeTokenAssets = async (): Promise<IBCNativeTokenModel[]> => {
    const requestUri =
      TokenRepository.GNO_TOKEN_RESOURCE_URI + `/ibc-native/${this.networkId}.json`;
    return this.networkInstance
      .get<IBCNativeTokenResponse>(requestUri)
      .then((response) => TokenMapper.fromIBCNativeMetainfos(this.networkId, response.data))
      .catch(() => []);
  };

  private fetchIBCTokenAssets = async (): Promise<IBCTokenModel[]> => {
    const requestUri =
      TokenRepository.GNO_TOKEN_RESOURCE_URI + `/ibc-tokens/${this.networkId}.json`;
    return this.networkInstance
      .get<IBCTokenResponse>(requestUri)
      .then((response) => TokenMapper.fromIBCTokenMetainfos(this.networkId, response.data))
      .catch(() => []);
  };

  private static postRPCRequest = <T = any>(
    axiosInstance: AxiosInstance,
    url: string,
    data: any,
  ): Promise<T | null> => {
    return axiosInstance
      .post<T>(url, data)
      .then((response) => response.data)
      .catch((e) => {
        console.log(e);
        return null;
      });
  };

  private static postGraphQuery = <T = any>(
    axiosInstance: AxiosInstance,
    url: string,
    query: string,
    header?: { [key in string]: number } | null,
  ): Promise<T | null> => {
    return axiosInstance
      .post<T>(
        url,
        {
          query,
        },
        {
          headers: header || {},
        },
      )
      .then((response) => response.data)
      .catch((e) => {
        console.log(e);
        return null;
      });
  };
}
