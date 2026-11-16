import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';

import { AccountTokenBalance, Amount, TokenBalanceType } from '@types';

export const isLoading = atomWithReset(false);

export const accountTokenBalances = atomWithReset<AccountTokenBalance[]>([]);

export const mainTokenBalance = atom<Amount | undefined>(undefined);

export const currentTokenBalances = atom<TokenBalanceType[]>([]);

export const displayTokenBalances = atom<TokenBalanceType[]>([]);

export const accountNativeBalances = atom<{ [key in string]: TokenBalanceType }>({});
