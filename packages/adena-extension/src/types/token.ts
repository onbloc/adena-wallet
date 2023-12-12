export interface TokenModel {
  main: boolean;
  tokenId: string;
  networkId: string;
  display: boolean;
  type: 'gno-native' | 'grc20' | 'ibc-native' | 'ibc-tokens';
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  websiteUrl?: string;
  image: string;
}

export interface NativeTokenModel extends TokenModel {
  denom: string;
}

export interface GRC20TokenModel extends TokenModel {
  pkgPath: string;
}

export interface IBCNativeTokenModel extends TokenModel {
  denom: string;
}

export interface IBCTokenModel extends TokenModel {
  denom: string;
  originChain: string;
  originDenom: string;
  originType: string;
  path: string;
  channel: string;
  port: string;
}
