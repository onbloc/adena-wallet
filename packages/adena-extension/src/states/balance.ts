import { atom } from 'recoil';

import { AccountTokenBalance, Amount, TokenBalanceType } from '@types';

export const isLoading = atom({
  key: 'balance/is-loading',
  default: false,
});

export const accountTokenBalances = atom<AccountTokenBalance[]>({
  key: 'balance/account-token-balances',
  default: [],
});

export const mainTokenBalance = atom<Amount | undefined>({
  key: 'balance/main-token-balance',
  default: undefined,
});

export const currentTokenBalances = atom<TokenBalanceType[]>({
  key: 'balance/current-token-balances',
  default: [],
});

export const displayTokenBalances = atom<TokenBalanceType[]>({
  key: 'balance/display-token-balances',
  default: [],
});

export const accountNativeBalances = atom<{ [key in string]: TokenBalanceType }>({
  key: 'balance/account-native-balances',
  default: {},
});
