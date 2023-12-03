import { useWalletContext } from './use-context';
import { Account } from 'adena-module';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';

export const useRemoveAccount = (): {
  availRemoveAccount: () => Promise<boolean>;
  removeAccount: (account: Account) => Promise<boolean>;
} => {
  const { wallet, updateWallet } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();
  const { resetNetworkConnection } = useNetwork();

  const availRemoveAccount = async (): Promise<boolean> => {
    const accounts = wallet?.accounts ?? [];
    return accounts.length > 1;
  };

  const removeAccount = async (account: Account): Promise<boolean> => {
    if (!wallet) {
      return false;
    }
    resetNetworkConnection();
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
