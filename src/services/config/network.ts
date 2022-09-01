export interface AppConfig {
  readonly chainId: string;
  readonly chainName: string;
  readonly addressPrefix: string;
  readonly rpcUrl: string;
  readonly httpUrl: string;
  readonly token: any;
  readonly gasPrice: number;
  readonly gnoUrl: string;
  readonly explorerUrl: string;
}

export interface NetworkConfigs {
  readonly testnet: AppConfig;
  readonly [key: string]: AppConfig;
}

export function getAppConfig(configs: NetworkConfigs): AppConfig {
  const network = process.env.REACT_APP_NETWORK;
  if (!network) return configs.testnet;

  const config = configs[network];
  if (!config) {
    throw new Error(`No configuration found for network ${network}`);
  }

  return config;
}
