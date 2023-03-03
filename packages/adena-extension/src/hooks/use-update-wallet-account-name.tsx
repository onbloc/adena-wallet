import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';

/**
 *
 * @returns
 */
export const useUpdateWalletAccountName = (): ((address: string, name: string) => void) => {
  const { accountService } = useAdenaContext();
  const [, setAccounts] = useRecoilState(WalletState.accounts);
  const [, setCurrentAccount] = useRecoilState(WalletState.currentAccount);

  const updateAccountName = async (address: string, name: string) => {
    const account = await accountService.getCurrentAccount();
    await accountService.updateAccountName(account, name);
    const changedAccounts = await accountService.getAccounts();
    setAccounts(changedAccounts);

    const currentAccount = await accountService.getCurrentAccount();
    setCurrentAccount(currentAccount);
  };

  return updateAccountName;
};
