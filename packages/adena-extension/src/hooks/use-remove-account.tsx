import { useWalletContext } from './use-context';
import { Account } from 'adena-module';
import { useCurrentAccount } from './use-current-account';

export const useRemoveAccount = (): {
  availRemoveAccount: () => Promise<boolean>,
  removeAccount: (account: Account) => Promise<boolean>,
} => {
  const { wallet, updateWallet } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();

  const availRemoveAccount = async () => {
    const accounts = wallet?.accounts ?? [];
    return accounts.length > 1;
  };

  const removeAccount = async (account: Account) => {
    if (!wallet) {
      return false;
    }
    const clone = wallet.clone();
    clone.removeAccount(account);
    const nextAccount = clone.accounts[clone.accounts.length - 1];
    clone.currentAccountId = nextAccount.id;
    await updateWallet(clone);
    await changeCurrentAccount(nextAccount);
    return true;
  };

  return { availRemoveAccount, removeAccount };
};
