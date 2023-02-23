import { useRecoilState, useResetRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useAdenaContext } from './use-context';
import { WalletAccount } from 'adena-module';

export const useImportAccount = (): {
  importAccount: (account: InstanceType<typeof WalletAccount>) => Promise<boolean>,
} => {
  const { accountService } = useAdenaContext();
  const [, setAccounts] = useRecoilState(WalletState.accounts);
  const [, setState] = useRecoilState(WalletState.state);
  const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);

  const importAccount = async (account: InstanceType<typeof WalletAccount>) => {
    setState("LOADING");
    const currentAccountIndex = await accountService.getLastAccountIndex();
    const index = currentAccountIndex + 1;
    account.setIndex(index);
    account.setName(`Account ${index}`)
    await accountService.addAccount(account);
    await accountService.changeCurrentAccount(account);
    clearCurrentBalance();
    accountService.getAccounts().then(setAccounts);
    return true;
  };

  return { importAccount };
};
