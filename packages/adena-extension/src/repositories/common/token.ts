import { TokenConfig } from "@states/wallet";
import { AxiosInstance } from "axios";

interface TokenConfigResponse {
  main: boolean;
  type: string;
  name: string;
  denom: string;
  unit: number;
  minimalDenom: string;
  minimalUnit: number;
  image: string;
  imageData?: string;
}

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

  private static TOKEN_CONFIG_URI = "https://raw.githubusercontent.com/onbloc/adena-resource/main/configs/tokens.json";

  private static APP_INFO_URI = "https://raw.githubusercontent.com/onbloc/adena-resource/main/configs/apps.json";

  private networkInstance: AxiosInstance;

  constructor(networkInstance: AxiosInstance) {
    this.networkInstance = networkInstance;
  }

  public fetchTokenConfigs = async (): Promise<Array<TokenConfig>> => {
    const response = await this.networkInstance.get<Array<TokenConfigResponse>>(TokenRepository.TOKEN_CONFIG_URI);
    const configs = response.data;
    const changedConfigs = [];

    for (const config of configs) {
      const imageData = await this.fetchResource(config.image);
      changedConfigs.push({
        ...config,
        imageData
      })
    }
    return changedConfigs;
  };

  public fetchAppInfos = async (): Promise<Array<AppInfoResponse>> => {
    const response = await this.networkInstance.get<Array<AppInfoResponse>>(TokenRepository.APP_INFO_URI);
    return response.data;
  };

  private fetchResource = async (imageUri: string) => {
    try {
      const response = await this.networkInstance.get(imageUri, { responseType: 'arraybuffer', });
      const imageData = 'data:image/svg+xml;base64,' + Buffer.from(response.data, 'binary').toString('base64');
      return imageData;
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }
}