import { useQueryClient } from '@tanstack/react-query';

import { SESSIONS_QUERY_KEY } from '@hooks/use-sessions';
import { Account, isSessionAccount } from 'adena-module';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';

export const useRemoveAccount = (): {
  availRemoveAccount: () => Promise<boolean>;
  removeAccount: (account: Account) => Promise<boolean>;
} => {
  const { wallet, updateWallet } = useWalletContext();
  const { sessionRepository } = useAdenaContext();
  const { changeCurrentAccount } = useCurrentAccount();
  const queryClient = useQueryClient();

  const availRemoveAccount = async (): Promise<boolean> => {
    const accounts = wallet?.accounts ?? [];
    return accounts.length > 1;
  };

  const removeAccount = async (account: Account): Promise<boolean> => {
    if (!wallet) {
      return false;
    }
    const clone = wallet.clone();
    clone.removeAccount(account);
    const nextAccount = clone.accounts[clone.accounts.length - 1];
    clone.currentAccountId = nextAccount.id;
    await changeCurrentAccount(nextAccount);
    await updateWallet(clone);

    if (isSessionAccount(account)) {
      const sessionAddr = await account.getAddress('g').catch(() => null);
      if (sessionAddr) {
        await sessionRepository.remove(sessionAddr).catch(() => undefined);
        await queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
      }
    }
    return true;
  };

  return { availRemoveAccount, removeAccount };
};
