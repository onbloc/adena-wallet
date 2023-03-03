import { GnoClientState, WalletState } from '@states/index';
import { WalletAccount } from 'adena-module';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';
import { useLoadAccounts } from './use-load-accounts';

export const useCurrentAccount = (): [
  account: InstanceType<typeof WalletAccount> | null,
  updateCurrentAccountInfo: (address?: string) => void,
  changeCurrentAccount: (changedAccount: InstanceType<typeof WalletAccount>) => void,
] => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount)
  const { accounts } = useLoadAccounts();
  const { accountService } = useAdenaContext();
  const [gnoClient] = useRecoilState(GnoClientState.current);
  const [walletAccounts] = useRecoilState(WalletState.accounts);

  useEffect(() => {
    accountService.getCurrentAccount().then(setCurrentAccount);
  }, [accounts]);

  const updateCurrentAccountInfo = async (address?: string) => {
    const currentAccount = await accountService.getCurrentAccount();
    const currentAddress = address ?? currentAccount?.getAddress();
    const account = walletAccounts?.find(item => item.data.address === currentAddress);
    if (gnoClient && account) {
      await accountService.updateAccountInfo(account);
    }
  };

  const changeCurrentAccount = async (
    changedAccount: InstanceType<typeof WalletAccount>,
  ) => {
    await accountService.changeCurrentAccount(changedAccount);
    setCurrentAccount(changedAccount);
  };

  return [currentAccount, updateCurrentAccountInfo, changeCurrentAccount];
};
