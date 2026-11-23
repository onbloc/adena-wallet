// Each family is served by its own chain module (see repositories/chain).
export const ChainFamily = {
  GNO: 'gno',
  COSMOS: 'cosmos',
} as const;

export type ChainFamily = (typeof ChainFamily)[keyof typeof ChainFamily];

export interface NativeToken {
  id: string;
  symbol: string;
  denom: string;
  decimals: number;
}

export interface Network {
  id: string;
  family: ChainFamily;
  chainId: string;
  chainName: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  fallbackRpcUrl?: string;
  // Cosmos SDK LCD endpoint; every cosmos query and broadcast goes through it.
  restUrl?: string;
  // REST data source for tokens, NFTs, history and prices; features are unavailable without it.
  apiUrl?: string;
  linkUrl?: string;
  nativeToken: NativeToken;
  // Token used to pay fees (GNOT on Gno, PHOTON on AtomOne).
  feeToken: NativeToken;
  // Coins listed by default on this network (denoms).
  defaultTokenIds: string[];
  // Used when the node does not report a minimum gas price.
  fallbackGasPrice?: string;
  isMainnet: boolean;
  isCustom: boolean;
}
