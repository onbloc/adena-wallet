import { useWalletContext } from './use-context';
import { useTokenBalance } from './use-token-balance';

export const useWalletAccounts = () => {
  const { wallet } = useWalletContext();
  const { accountTokenBalances } = useTokenBalance();

  return {
    accounts: wallet?.accounts ?? [],
    accountBalances: accountTokenBalances
  };
};
