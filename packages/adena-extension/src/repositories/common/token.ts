import { StorageManager } from '@common/storage/storage-manager';
import { TokenMetainfo } from '@states/token';
import { AxiosInstance } from 'axios';

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
  {
    main: false,
    tokenId: 'gno.land/r/demo/foo20',
    name: 'Foo',
    chainId: 'GNOLAND',
    networkId: 'test3',
    image: '',
    pkgPath: 'gno.land/r/demo/foo20',
    symbol: 'FOO',
    type: 'GRC20',
    decimals: 4,
    denom: 'FOO',
    minimalDenom: 'ufoo',
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

    const changedAccountTokenMetainfos = {
      ...accountTokenMetainfos,
      [accountId]: tokenMetainfos,
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

  private fetchResource = async (imageUri: string) => {
    try {
      const response = await this.networkInstance.get(imageUri, { responseType: 'arraybuffer' });
      const imageData =
        'data:image/svg+xml;base64,' + Buffer.from(response.data, 'binary').toString('base64');
      return imageData;
    } catch (e) {
      console.error(e);
    }
    return undefined;
  };
}
