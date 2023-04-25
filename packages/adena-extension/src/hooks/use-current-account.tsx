import { WalletState } from '@states/index';
import { Account } from 'adena-module';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';
import { useNetwork } from './use-network';

export const useCurrentAccount = (): {
  currentAccount: Account | null,
  currentAddress: string | null,
  changeCurrentAccount: (changedAccount: Account) => void,
} => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount)
  const { accountService } = useAdenaContext();
  const { currentNetwork } = useNetwork();

  const changeCurrentAccount = async (
    changedAccount: Account,
  ) => {
    await accountService.changeCurrentAccount(changedAccount);
    setCurrentAccount(changedAccount);
  };

  return {
    currentAccount,
    currentAddress: currentAccount?.getAddress(currentNetwork?.addressPrefix ?? 'g') ?? null,
    changeCurrentAccount
  };
};
