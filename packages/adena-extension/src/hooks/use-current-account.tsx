import { WalletState } from '@states/index';
import { Account } from 'adena-module';
import { useRecoilState } from 'recoil';
import { useAdenaContext, useWalletContext } from './use-context';
import { useNetwork } from './use-network';

export const useCurrentAccount = (): {
  currentAccount: Account | null,
  currentAddress: string | null,
  changeCurrentAccount: (changedAccount: Account) => Promise<boolean>,
} => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount)
  const { accountService } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { currentNetwork } = useNetwork();

  const changeCurrentAccount = async (
    changedAccount: Account,
  ) => {
    if (!wallet) {
      return false;
    }
    await accountService.changeCurrentAccount(changedAccount);
    const clone = wallet.clone();
    clone.currentAccountId = changedAccount.id;
    setCurrentAccount(changedAccount);
    return true;
  };

  return {
    currentAccount,
    currentAddress: currentAccount?.getAddress(currentNetwork?.addressPrefix ?? 'g') ?? null,
    changeCurrentAccount
  };
};
