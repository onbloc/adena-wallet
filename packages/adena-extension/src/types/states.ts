import { TokenModel } from './';

export interface TokenBalanceType extends TokenModel {
  amount: Amount;
}

export interface Amount {
  value: string;
  denom: string;
}

export interface AccountTokenBalance {
  accountId: string;
  chainId: string;
  networkId: string;
  tokenBalances: TokenBalanceType[];
}

export interface NetworkMetainfo {
  id: string;
  default: boolean;
  main?: boolean;
  chainId: string;
  chainName: string;
  networkId: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  gnoUrl: string;
  apiUrl: string;
  linkUrl: string;
  deleted?: boolean;
}

/**
 * CREATE: When there is no stored serialized wallet value
 * LOGIN: When there is no encrypted password value
 * LOADING: During deserialization
 * FINISH: When deserialization is complete
 * FAIL: When deserialization has failed
 */
export type StateType = 'CREATE' | 'LOGIN' | 'LOADING' | 'FINISH' | 'FAIL' | 'NONE';
