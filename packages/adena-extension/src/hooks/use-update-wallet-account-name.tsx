import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { Account } from 'adena-module';

/**
 *
 * @returns
 */
export const useUpdateWalletAccountName = (): ((account: Account, name: string) => void) => {
  const [, setCurrentAccount] = useRecoilState(WalletState.currentAccount);

  const updateAccountName = async (account: Account, name: string) => {
    account.name = name;
    setCurrentAccount(account);
  };

  return updateAccountName;
};
