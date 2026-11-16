import { Account } from 'adena-module';

import { AccountTokenBalance } from '@types';
import { useWalletContext } from './use-context';

export type UseWalletAccountsReturn = {
  accounts: Array<Account>;
  accountBalances: AccountTokenBalance[];
};

export const useWalletAccounts = (): UseWalletAccountsReturn => {
  const { wallet } = useWalletContext();

  return {
    accounts: wallet?.accounts ?? [],
    accountBalances: [],
  };
};
