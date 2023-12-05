import { AccountTokenBalance } from '@states/balance';
import { useWalletContext } from './use-context';
import { useTokenBalance } from './use-token-balance';
import { Account } from 'adena-module';

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
