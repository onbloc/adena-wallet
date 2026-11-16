import { WalletState } from '@states';
import { useAtom } from 'jotai';
import { Account } from 'adena-module';

export type UseUpdateWalletAccountNameReturn = (account: Account, name: string) => void;

export const useUpdateWalletAccountName = (): UseUpdateWalletAccountNameReturn => {
  const [, setCurrentAccount] = useAtom(WalletState.currentAccount);

  const updateAccountName = async (account: Account, name: string): Promise<void> => {
    account.name = name;
    setCurrentAccount(account);
  };

  return updateAccountName;
};
