import { useRecoilState, useResetRecoilState } from 'recoil';
import { Account } from 'adena-module';
import { WalletState } from '@states/index';
import { useAdenaContext, useWalletContext } from './use-context';
import { useLoadAccounts } from './use-load-accounts';

export const useImportAccount = (): {
  importAccount: (account: Account) => Promise<boolean>,
} => {
  const { wallet } = useWalletContext();
  const { accountService } = useAdenaContext();
  const [, setCurrentAccount] = useRecoilState(WalletState.currentAccount);
  const [, setState] = useRecoilState(WalletState.state);
  const { loadAccounts } = useLoadAccounts();

  const importAccount = async (account: Account) => {
    if (!wallet) {
      return false;
    }
    setState("LOADING");
    account.name = `${wallet.nextAccountName}`;
    wallet.addAccount(account);
    await accountService.changeCurrentAccount(account);
    setCurrentAccount(account);
    await loadAccounts();
    return true;
  };

  return { importAccount };
};
