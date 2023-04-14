import { GnoClientState, WalletState } from '@states/index';
import { Account } from 'adena-module';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';
import { useLoadAccounts } from './use-load-accounts';

export const useCurrentAccount = (): [
  account: Account | null,
  updateCurrentAccountInfo: (address?: string) => void,
  changeCurrentAccount: (changedAccount: Account) => void,
] => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount)
  const { accounts } = useLoadAccounts();
  const { accountService } = useAdenaContext();
  const [gnoClient] = useRecoilState(GnoClientState.current);
  const [Accounts] = useRecoilState(WalletState.accounts);

  useEffect(() => {
    accountService.getCurrentAccount().then(setCurrentAccount);
  }, [accounts]);

  const updateCurrentAccountInfo = async (address?: string) => {
    const currentAccount = await accountService.getCurrentAccount();
    const currentAddress = address ?? currentAccount?.getAddress('g');
    const account = Accounts?.find(item => item.getAddress('g') === currentAddress);
    if (gnoClient && account) {
      await accountService.updateAccountInfo(account);
    }
  };

  const changeCurrentAccount = async (
    changedAccount: Account,
  ) => {
    await accountService.changeCurrentAccount(changedAccount);
    setCurrentAccount(changedAccount);
  };

  return [currentAccount, updateCurrentAccountInfo, changeCurrentAccount];
};
