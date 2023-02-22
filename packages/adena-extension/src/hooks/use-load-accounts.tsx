import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';
import { WalletAccount } from 'adena-module';

export const useLoadAccounts = () => {
  const { accountService } = useAdenaContext();
  const [state, setState] = useRecoilState(WalletState.state);
  const [accounts, setAccounts] = useRecoilState(WalletState.accounts);

  const loadAccounts = async () => {
    setState("LOADING");
    const accounts = await accountService.getAccounts();
    if (accounts.length === 0) {
      setState("CREATE");
      return false;
    }

    setAccounts(accounts);
    setState("FINISH");
    return true;
  };

  const addAccounts = async (addedAccounts: Array<InstanceType<typeof WalletAccount>>) => {
    setState("LOADING");
    for (const account of addedAccounts) {
      await accountService.addAccount(account);
    }

    const accounts = await accountService.getAccounts();
    setAccounts(accounts);
    setState("FINISH");
    return true;
  };

  return { state, accounts, loadAccounts, addAccounts };
};
