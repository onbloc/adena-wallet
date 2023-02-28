import { useRecoilState, useResetRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useAdenaContext } from './use-context';
import { WalletAccount } from 'adena-module';
import { useLoadAccounts } from './use-load-accounts';

export const useImportAccount = (): {
  importAccount: (account: InstanceType<typeof WalletAccount>) => Promise<boolean>,
} => {
  const { accountService } = useAdenaContext();
  const [, setCurrentAccount] = useRecoilState(WalletState.currentAccount);
  const [, setState] = useRecoilState(WalletState.state);
  const { loadAccounts } = useLoadAccounts();
  const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);

  const importAccount = async (account: InstanceType<typeof WalletAccount>) => {
    setState("LOADING");
    clearCurrentBalance();
    const currentAccountIndex = await accountService.getLastAccountIndex();
    const index = currentAccountIndex + 1;
    account.setIndex(index);
    account.setName(`Account ${index}`)
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
