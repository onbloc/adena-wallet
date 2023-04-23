import { useAdenaContext, useWalletContext } from './use-context';
import { Account } from 'adena-module';
import { useCurrentAccount } from './use-current-account';

export const useRemoveAccount = (): {
  availRemoveAccount: () => Promise<boolean>,
  removeAccount: (account: Account) => Promise<boolean>,
} => {
  const { wallet } = useWalletContext();
  const { currentAccount } = useCurrentAccount();

  const availRemoveAccount = async () => {
    const accounts = wallet?.accounts ?? [];
    return accounts.length > 1;
  };

  const removeAccount = async () => {
    if (wallet && currentAccount) {
      wallet.removeAccount(currentAccount);
    }
    return true;
  };

  return { availRemoveAccount, removeAccount };
};
