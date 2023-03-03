import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';
import { useEffect } from 'react';

export const useWalletAccounts = () => {
  const { accountService } = useAdenaContext();
  const [walletAccounts, setWalletAccounts] = useRecoilState(WalletState.accounts);
  const [accountBalances] = useRecoilState(WalletState.accountBalances);

  useEffect(() => {
    accountService.getAccounts().then(setWalletAccounts);
  }, []);

  return {
    accounts: walletAccounts ?? [],
    accountBalances
  };
};
