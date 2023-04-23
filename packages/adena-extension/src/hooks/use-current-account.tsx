import { WalletState } from '@states/index';
import { Account } from 'adena-module';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';

export const useCurrentAccount = (): {
  currentAccount: Account | null,
  changeCurrentAccount: (changedAccount: Account) => void,
} => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount)
  const { accountService } = useAdenaContext();

  const changeCurrentAccount = async (
    changedAccount: Account,
  ) => {
    await accountService.changeCurrentAccount(changedAccount);
    setCurrentAccount(changedAccount);
  };

  return {
    currentAccount,
    changeCurrentAccount
  };
};
