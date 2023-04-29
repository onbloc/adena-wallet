import { useWalletContext } from './use-context';
import { Account } from 'adena-module';
import { useCurrentAccount } from './use-current-account';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';

export const useRemoveAccount = (): {
  availRemoveAccount: () => Promise<boolean>,
  removeAccount: (account: Account) => Promise<boolean>,
} => {
  const { wallet, updateWallet } = useWalletContext();
  const [, setState] = useRecoilState(WalletState.state);
  const { changeCurrentAccount } = useCurrentAccount();

  const availRemoveAccount = async () => {
    const accounts = wallet?.accounts ?? [];
    return accounts.length > 1;
  };

  const removeAccount = async (account: Account) => {
    if (!wallet) {
      return false;
    }
    setState('LOADING');
    const clone = wallet.clone();
    clone.removeAccount(account);
    const nextAccount = clone.accounts[clone.accounts.length - 1];
    clone.currentAccountId = nextAccount.id;
    await changeCurrentAccount(nextAccount);
    await updateWallet(clone);
    setState('FINISH');
    return true;
  };

  return { availRemoveAccount, removeAccount };
};
