import { TokenMetainfo } from '@states/token';
import { AxiosInstance } from 'axios';

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

  private networkInstance: AxiosInstance;

  constructor(networkInstance: AxiosInstance) {
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
