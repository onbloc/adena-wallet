import {
  WalletState,
} from '@states';
import {
  Account,
} from 'adena-module';
import {
  useRecoilState,
} from 'recoil';

export type UseUpdateWalletAccountNameReturn = (account: Account, name: string) => void;

export const useUpdateWalletAccountName = (): UseUpdateWalletAccountNameReturn => {
  const [, setCurrentAccount] = useRecoilState(WalletState.currentAccount);

  const updateAccountName = async (account: Account, name: string): Promise<void> => {
    account.name = name;
    setCurrentAccount(account);
  };

  return updateAccountName;
};
