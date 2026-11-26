import { AccountTokenBalance } from '@types';
import { atomWithReset } from 'jotai/utils';

export const isLoading = atomWithReset(false);

export const accountTokenBalances = atomWithReset<AccountTokenBalance[]>([]);
