import axios from "axios";
import { TokenConfig } from "@states/wallet";
import { ChainRepository } from "@repositories/common";

const TOKEN_CONFIG_URI = "https://raw.githubusercontent.com/onbloc/adena-resource/feature/structure/configs/tokens.json";
const APP_INFO_URI = "https://raw.githubusercontent.com/onbloc/adena-resource/feature/structure/configs/apps.json";
const CHAIN_URI = "https://raw.githubusercontent.com/onbloc/adena-resource/feature/structure/configs/chains.json";

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

interface ChainResponse {
  main: boolean;
  chainId: string;
  chainName: string;
  order: number;
  networks: Array<NetworkResponse>;
};

interface NetworkResponse {
  main: boolean;
  networkId: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  gnoUrl: string;
  apiUrl: string;
  linkUrl: string;
  token: {
    denom: string;
    unit: number;
    minimalDenom: string;
    minimalUnit: number;
  }
};

export class ResourceService {

  private chainRepository: ChainRepository;

  constructor(chainRepository: ChainRepository) {
    this.chainRepository = chainRepository;
  }

  public fetchTokenConfigs = async (): Promise<Array<TokenConfig>> => {
    const response = await axios.get<Array<TokenConfigResponse>>(TOKEN_CONFIG_URI);
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
    const response = await axios.get<Array<AppInfoResponse>>(APP_INFO_URI);
    return response.data;
  };

  public fetchChainNetworks = async () => {
    const response = await axios.get<Array<ChainResponse>>(CHAIN_URI);
    const networks = response.data.find(chain => chain.main)?.networks ?? [];
    const mappedNetworks = networks.map(network => {
      return {
        ...network,
        chainId: network.networkId,
        chainName: network.networkName
      }
    });
    this.chainRepository.updateNetworks(mappedNetworks);
    return mappedNetworks;
  };

  public getCurrentChainId = async () => {
    const chainId = await this.chainRepository.getCurrentChainId();
    if (chainId?.toUpperCase() === "TEST2") {
      return "TEST2";
    }
    return "TEST3";
  };

  public updateCurrentChainId = async (chainId: string) => {
    return this.chainRepository.updateCurrentChainId(chainId);
  };

  private fetchResource = async (imageUri: string) => {
    try {
      const response = await axios.get(imageUri, { responseType: 'arraybuffer', });
      const imageData = 'data:image/svg+xml;base64,' + Buffer.from(response.data, 'binary').toString('base64');
      return imageData;
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }
}
