import { atom } from 'recoil';
import { TokenModel } from '@models/token-model';

export interface TokenBalance extends TokenModel {
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

export const isLoading = atom({
  key: `balance/is-loading`,
  default: false,
});

export const accountTokenBalances = atom<AccountTokenBalance[]>({
  key: `balance/account-token-balances`,
  default: [],
});

export const mainTokenBalance = atom<Amount | undefined>({
  key: `balance/main-token-balance`,
  default: undefined,
});

export const currentTokenBalances = atom<TokenBalance[]>({
  key: `balance/current-token-balances`,
  default: [],
});

export const displayTokenBalances = atom<TokenBalance[]>({
  key: `balance/display-token-balances`,
  default: [],
});

export const accountNativeBalances = atom<{ [key in string]: TokenBalance }>({
  key: `balance/account-native-balances`,
  default: {},
});
