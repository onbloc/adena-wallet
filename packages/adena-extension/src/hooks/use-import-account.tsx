import { useRecoilState } from 'recoil';
import { Account } from 'adena-module';
import { WalletState } from '@states/index';
import { useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';

export const useImportAccount = (): {
  importAccount: (account: Account) => Promise<boolean>,
} => {
  const { wallet, updateWallet } = useWalletContext();
  const [, setState] = useRecoilState(WalletState.state);
  const { changeCurrentAccount } = useCurrentAccount();

  const importAccount = async (account: Account) => {
    if (!wallet) {
      return false;
    }
    setState('LOADING');
    account.index = wallet.lastAccountIndex + 1;
    account.name = `Account ${account.index + 1}`;
    const clone = wallet.clone();
    clone.addAccount(account);
    const storedAccount = clone.accounts.find(storedAccount => storedAccount.id === account.id);
    if (storedAccount) {
      await changeCurrentAccount(storedAccount);
    }
    setState('FINISH');
    await updateWallet(clone);
    return true;
  };

  return { importAccount };
};
