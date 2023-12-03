import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { Account } from 'adena-module';

export type UseUpdateWalletAccountNameReturn = (account: Account, name: string) => void;

export const useUpdateWalletAccountName = (): UseUpdateWalletAccountNameReturn => {
  const [, setCurrentAccount] = useRecoilState(WalletState.currentAccount);

  const updateAccountName = async (account: Account, name: string): Promise<void> => {
    account.name = name;
    setCurrentAccount(account);
  };

  return updateAccountName;
};
