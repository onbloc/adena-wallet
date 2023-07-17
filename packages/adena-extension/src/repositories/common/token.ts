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

type LocalValueType = 'ACCOUNT_TOKEN_METAINFOS';

const DEFAULT_TOKEN_METAINFOS: NativeTokenModel[] = [
  {
    main: true,
    tokenId: 'Gnoland',
    name: 'Gnoland',
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
  private static ADENA_API_URI = 'https://api.adena.app';

  private static GNO_TOKEN_RESOURCE_URI =
    'https://raw.githubusercontent.com/onbloc/gno-token-resource/main';

  private static APP_INFO_URI = '/resources/apps/apps.json';

  private localStorage: StorageManager<LocalValueType>;

  private networkInstance: AxiosInstance;

  constructor(localStorage: StorageManager, networkInstance: AxiosInstance) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
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
    const body = {
      keyword,
    };
    const response = await this.networkInstance.post<SearchGRC20TokenResponse>(
      `${TokenRepository.ADENA_API_URI}/test3/search-grc20-tokens`,
      body,
    );
    return TokenMapper.fromSearchTokensResponse(response.data, tokenInfos);
  };

  public getAllTokenMetainfos = async (): Promise<{ [key in string]: TokenModel[] }> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<
      { [key in string]: TokenModel[] }
    >('ACCOUNT_TOKEN_METAINFOS');

    return accountTokenMetainfos;
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

    const filteredTokenMetainfos = tokenMetainfos.filter((info1, index) => {
      return tokenMetainfos.findIndex((info2) => info1.tokenId === info2.tokenId) === index;
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
      .then((response) => TokenMapper.fromNativeTokenMetainfos(response.data))
      .catch(() => DEFAULT_TOKEN_METAINFOS);
  };

  private fetchGRC20TokenAssets = async (): Promise<GRC20TokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + '/grc20/assets.json';
    return this.networkInstance
      .get<GRC20TokenResponse>(requestUri)
      .then((response) => TokenMapper.fromGRC20TokenMetainfos(response.data))
      .catch(() => []);
  };

  private fetchIBCNativeTokenAssets = async (): Promise<IBCNativeTokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + '/ibc-native/assets.json';
    return this.networkInstance
      .get<IBCNativeTokenResponse>(requestUri)
      .then((response) => TokenMapper.fromIBCNativeMetainfos(response.data))
      .catch(() => []);
  };

  private fetchIBCTokenAssets = async (): Promise<IBCTokenModel[]> => {
    const requestUri = TokenRepository.GNO_TOKEN_RESOURCE_URI + '/ibc-tokens/assets.json';
    return this.networkInstance
      .get<IBCTokenResponse>(requestUri)
      .then((response) => TokenMapper.fromIBCTokenMetainfos(response.data))
      .catch(() => []);
  };
}
