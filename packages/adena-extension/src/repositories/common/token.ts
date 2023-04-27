import { StorageManager } from '@common/storage/storage-manager';
import { TokenMetainfo } from '@states/token';
import { AxiosInstance } from 'axios';
import { SearchGRC20TokenResponse } from './response/search-grc20-token-response';
import { GRC20TokenMapper } from './mapper/grc20-token-mapper';

type LocalValueType = 'ACCOUNT_TOKEN_METAINFOS';

const TOKEN_METAINFOS: TokenMetainfo[] = [
  {
    main: true,
    tokenId: 'Gnoland',
    name: 'Gnoland',
    chainId: 'GNOLAND',
    networkId: 'test3',
    image: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
    pkgPath: '',
    symbol: 'GNOT',
    type: 'NATIVE',
    decimals: 6,
    denom: 'GNOT',
    minimalDenom: 'ugnot',
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
  private static ADENA_API_URI = 'https://dev-api.adena.app';

  private static TOKEN_CONFIG_URI =
    'https://raw.githubusercontent.com/onbloc/adena-resource/main/configs/tokens.json';

  private static APP_INFO_URI =
    'https://raw.githubusercontent.com/onbloc/adena-resource/main/configs/apps.json';

  private localStorage: StorageManager<LocalValueType>;

  private networkInstance: AxiosInstance;

  constructor(localStorage: StorageManager, networkInstance: AxiosInstance) {
    this.localStorage = localStorage;
    this.networkInstance = networkInstance;
  }

  public fetchTokenMetainfos = async (): Promise<TokenMetainfo[]> => {
    return TOKEN_METAINFOS;
  };

  public fetchAppInfos = async (): Promise<Array<AppInfoResponse>> => {
    const response = await this.networkInstance.get<Array<AppInfoResponse>>(
      TokenRepository.APP_INFO_URI,
    );
    return response.data;
  };

  public fetchGRC20TokensBy = async (keyword: string) => {
    const body = {
      keyword,
    };
    const response = await this.networkInstance.post<SearchGRC20TokenResponse>(
      `${TokenRepository.ADENA_API_URI}/test3/search-grc20-tokens`,
      body,
    );
    return GRC20TokenMapper.fromSearchTokensResponse(response.data);
  };

  public getAllTokenMetainfos = async (): Promise<{ [key in string]: TokenMetainfo[] }> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<
      { [key in string]: TokenMetainfo[] }
    >('ACCOUNT_TOKEN_METAINFOS');

    return accountTokenMetainfos;
  };

  public getAccountTokenMetainfos = async (accountId: string): Promise<TokenMetainfo[]> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<
      { [key in string]: TokenMetainfo[] }
    >('ACCOUNT_TOKEN_METAINFOS');

    return accountTokenMetainfos[accountId] ?? [];
  };

  public updateTokenMetainfos = async (
    accountId: string,
    tokenMetainfos: TokenMetainfo[],
  ): Promise<boolean> => {
    const accountTokenMetainfos = await this.localStorage.getToObject<
      { [key in string]: TokenMetainfo[] }
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
      { [key in string]: TokenMetainfo[] }
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
}
