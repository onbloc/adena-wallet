import { Account } from 'adena-module';
import { useAdenaContext } from './use-context';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';

export const useAccountName = () => {
  const { accountService } = useAdenaContext();
  const [accountNames, setAccountNames] = useRecoilState(WalletState.accountNames);

  const initAccountNames = async (accounts: Account[]) => {
    const storedAccountNames = await accountService.getAccountNames();
    const accountNames: { [key in string]: string } = {};
    for (const account of accounts) {
      accountNames[account.id] = account.name;
    }
    const changedAccountNames = { ...accountNames, ...storedAccountNames };
    setAccountNames(changedAccountNames)
    await accountService.updateAccountNames(changedAccountNames);
  };

  const changeAccountName = async (account: Account, name: string) => {
    const changedAccountNames = {
      ...accountNames,
      [account.id]: name || account.name
    };
    setAccountNames(changedAccountNames);
    await accountService.updateAccountNames(changedAccountNames);
  };

  const clear = async () => {
    setAccountNames({});
    await accountService.deleteAccountNames();
  };

  return {
    accountNames,
    initAccountNames,
    changeAccountName,
    clear
  };
};
