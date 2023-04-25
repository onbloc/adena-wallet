import { atom } from 'recoil';
import { TokenMetainfo } from './token';

export interface TokenBalance extends TokenMetainfo {
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
  tokenBalances: TokenBalance[];
}

export const accountTokenBalances = atom<AccountTokenBalance[]>({
  key: `balance/account-token-balances`,
  default: [],
});
