import { WalletState } from '@states/index';
import { WalletAccount } from 'adena-module';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';

/**
 *
 * @returns
 */

export const useUpdateWalletAccountName = (): ((address: string, name: string) => void) => {
  const { accountService } = useAdenaContext();
  const [accounts, setAccounts] = useRecoilState(WalletState.accounts);
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount);

  const updateAccountName = async (address: string, name: string) => {
    await accountService.updateAccountName(address, name);
    await updateAccounts(address, name);
    await updateCurrentAccountName(address, name);
  };

  const updateCurrentAccountName = async (address: string, name: string) => {
    if (currentAccount) {
      const changedAccount = currentAccount.clone();
      if (address === currentAccount.getAddress()) {
        changedAccount.setName(name);
        setCurrentAccount(changedAccount);
      }
    }
  };

  const updateAccounts = async (address: string, name: string) => {
    if (accounts) {
      const changedAccounts = [...accounts].map((account) =>
        account.getAddress() === address ? changeAccount(account, name) : account,
      );
      setAccounts(changedAccounts);
    }
  };

  const changeAccount = (account: InstanceType<typeof WalletAccount>, name: string) => {
    const changedAccount = account.clone();
    changedAccount.setName(name);
    return changedAccount;
  };

  return updateAccountName;
};
