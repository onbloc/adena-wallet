import { useRecoilState, useResetRecoilState } from 'recoil';
import { Account } from 'adena-module';
import { WalletState } from '@states/index';
import { useAdenaContext } from './use-context';
import { useLoadAccounts } from './use-load-accounts';

export const useImportAccount = (): {
  importAccount: (account: Account) => Promise<boolean>,
} => {
  const { accountService } = useAdenaContext();
  const [, setCurrentAccount] = useRecoilState(WalletState.currentAccount);
  const [, setState] = useRecoilState(WalletState.state);
  const { loadAccounts } = useLoadAccounts();
  const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);

  const importAccount = async (account: Account) => {
    setState("LOADING");
    clearCurrentBalance();
    const currentAccountIndex = await accountService.getLastAccountIndex();
    const currentAccountNumber = await accountService.getAddedAccountNumber();
    const index = currentAccountIndex + 1;
    account.index = index;
    account.name = `Account ${currentAccountNumber}`;
    await accountService.addAccount(account);
    const accounts = await accountService.getAccounts();
    const currentAccount = accounts[accounts.length - 1];
    await accountService.updateCurrentAccount(currentAccount);
    setCurrentAccount(currentAccount);
    await loadAccounts();
    return true;
  };

  return { importAccount };
};
