import { AppConfig, getAppConfig, NetworkConfigs } from './config/network';

export const testnet: AppConfig = {
  chainId: 'test2',
  chainName: 'Gno Tesnet',
  addressPrefix: 'g1',
  rpcUrl: 'http://gno.land:36657',
  httpUrl: 'http://localhost:1317',
  gnoUrl: 'https://rpc.test2.gno.land',
  //explorerUrl: "https://api.adena.app",
  explorerUrl: 'http://localhost:7777',
  token: {
    coinDenom: 'UGNOT',
    coinDecimals: 6,
    coinMinimalDenom: 'ugnot',
  },
  gasPrice: 0.00000000000001,
};

export interface Token {
  readonly denom: string;
  readonly name: string;
  readonly decimals: number;
  readonly logo?: string;
}

export const coins: Token[] = [
  {
    denom: 'ugnot',
    name: 'UGNOT',
    decimals: 6,
  },
];

const configs: NetworkConfigs = { testnet };
export const config = getAppConfig(configs);
