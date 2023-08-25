import { StorageManager } from '@common/storage/storage-manager';
import { AxiosInstance } from 'axios';
import { SearchGRC20TokenResponse } from './response/search-grc20-token-response';
import {
  GRC20TokenModel,
  IBCNativeTokenModel,
  IBCTokenModel,
  NativeTokenModel,
  TokenModel,
} from '@models/token-model';
import {
  GRC20TokenResponse,
  IBCNativeTokenResponse,
  IBCTokenResponse,
  NativeTokenResponse,
} from './response/token-asset-response';
import { TokenMapper } from './mapper/token-mapper';
import { NetworkMetainfo } from '@states/network';

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

interface AppInfoResponse {
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

  constructor(localStorage: StorageManager, networkInstance: AxiosInstance) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
    this.networkMetainfo = null;
  }

  public setNetworkMetainfo(networkMetainfo: NetworkMetainfo) {
    this.networkMetainfo = networkMetainfo;
  }

  private getAPIUrl() {
    if (this.networkMetainfo === null || this.networkMetainfo.apiUrl === '') {
      return null;
    }
    return `${this.networkMetainfo.apiUrl}/${this.networkMetainfo.networkId}`;
  }

  public fetchTokenMetainfos = async (): Promise<TokenModel[]> => {
    return Promise.all([
      this.fetchNativeTokenAssets(),
      this.fetchGRC20TokenAssets(),
      this.fetchIBCNativeTokenAssets(),
      this.fetchIBCTokenAssets(),
    ]).then((datas) => datas.flat());
  };

  public fetchAppInfos = async (): Promise<Array<AppInfoResponse>> => {
    const apps = await fetch(TokenRepository.APP_INFO_URI);
    return apps.json();
  };

  public fetchGRC20TokensBy = async (keyword: string, tokenInfos?: TokenModel[]) => {
    const apiUrl = this.getAPIUrl();
    if (apiUrl === null) {
      return [];
    }
    const body = {
      keyword,
    };
    const response = await this.networkInstance.post<SearchGRC20TokenResponse>(
      `${apiUrl}/search-grc20-tokens`,
      body,
    );
    return TokenMapper.fromSearchTokensResponse(
      this.networkMetainfo?.networkId || '',
      response.data,
      tokenInfos,
    );
  };

  public getAccountTokenMetainfos = async (accountId: string): Promise<TokenModel[]> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<
      { [key in string]: TokenModel[] }
    >('ACCOUNT_TOKEN_METAINFOS');

    return accountTokenMetainfos[accountId] ?? [];
  };

  public updateTokenMetainfos = async (
    accountId: string,
    tokenMetainfos: TokenModel[],
  ): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<
      { [key in string]: TokenModel[] }
    >('ACCOUNT_TOKEN_METAINFOS');

    const isUnique = function (token0: TokenModel, token1: TokenModel) {
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
    const accountTokenMetainfos = await this.localStorage.getToObject<
      { [key in string]: TokenModel[] }
    >('ACCOUNT_TOKEN_METAINFOS');

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

  private fetchNativeTokenAssets = async (): Promise<NativeTokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + '/gno-native/assets.json';
    return this.networkInstance
      .get<NativeTokenResponse>(requestUri)
      .then((response) =>
        TokenMapper.fromNativeTokenMetainfos(DEFAULT_TOKEN_NETWORK_ID, response.data),
      )
      .catch(() => DEFAULT_TOKEN_METAINFOS);
  };

  private fetchGRC20TokenAssets = async (): Promise<GRC20TokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + '/grc20/assets.json';
    return this.networkInstance
      .get<GRC20TokenResponse>(requestUri)
      .then((response) =>
        TokenMapper.fromGRC20TokenMetainfos(DEFAULT_TOKEN_NETWORK_ID, response.data),
      )
      .catch(() => []);
  };

  private fetchIBCNativeTokenAssets = async (): Promise<IBCNativeTokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + '/ibc-native/assets.json';
    return this.networkInstance
      .get<IBCNativeTokenResponse>(requestUri)
      .then((response) =>
        TokenMapper.fromIBCNativeMetainfos(DEFAULT_TOKEN_NETWORK_ID, response.data),
      )
      .catch(() => []);
  };

  private fetchIBCTokenAssets = async (): Promise<IBCTokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + '/ibc-tokens/assets.json';
    return this.networkInstance
      .get<IBCTokenResponse>(requestUri)
      .then((response) =>
        TokenMapper.fromIBCTokenMetainfos(DEFAULT_TOKEN_NETWORK_ID, response.data),
      )
      .catch(() => []);
  };
}
