import { atom } from 'recoil';

export interface TokenBalance {
  main: boolean;
  tokenId: string;
  chainId: string;
  networkId: string;
  image?: string;
  pkgPath: string;
  symbol: string;
  type: 'NATIVE' | 'GRC20';
  name: string;
  decimals: number;
  denom: string;
  minimalDenom: string;
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
  key: `balance/account-toke-balances`,
  default: [],
});
