import { Account } from 'adena-module';

import { AccountTokenBalance } from '@types';
import { useWalletContext } from './use-context';
import { useTokenBalance } from './use-token-balance';

export type UseWalletAccountsReturn = {
  accounts: Array<Account>;
  accountBalances: AccountTokenBalance[];
};

export const useWalletAccounts = (): UseWalletAccountsReturn => {
  const { wallet } = useWalletContext();
  const { accountTokenBalances } = useTokenBalance();

  return {
    accounts: wallet?.accounts ?? [],
    accountBalances: accountTokenBalances,
  };
};
