import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';
import { Account } from 'adena-module';

export const useLoadAccounts = () => {
  const { walletService, accountService, balanceService } = useAdenaContext();
  const [state, setState] = useRecoilState(WalletState.state);
  const [accounts, setAccounts] = useRecoilState(WalletState.accounts);
  const [, setAccountBalances] = useRecoilState(WalletState.accountBalances);

  const loadAccounts = async () => {
    const accounts = await accountService.getAccounts();
    if (accounts.length === 0) {
      setState("CREATE");
      return false;
    }

    const isLocked = await walletService.isLocked();
    if (isLocked) {
      setState("LOGIN");
      return false;
    }

    setState("LOADING");
    setAccounts(accounts);
    return true;
  };

  const addAccounts = async (addedAccounts: Array<Account>) => {
    setState("LOADING");
    for (const account of addedAccounts) {
      await accountService.addAccount(account);
    }

    const accounts = await accountService.getAccounts();
    setAccounts(accounts);
    return true;
  };

  const updateAccountBalances = async () => {
    if (!accounts) {
      setAccountBalances({});
      return false;
    }

    const accountBalances: { [key in string]: Array<WalletState.Balance> } = {};
    for (const account of accounts) {
      const address = account.getAddress('g');
      const balances = await balanceService.getTokenBalances(address);
      accountBalances[address] = balances;
    }
    setAccountBalances(accountBalances);
    return true;
  };

  return { state, accounts, loadAccounts, addAccounts, updateAccountBalances };
};
