import { useRecoilState } from 'recoil';
import { Account } from 'adena-module';

import { useAdenaContext } from './use-context';
import { WalletState } from '@states';

export type UseAccountNameReturn = {
  accountNames: { [key in string]: string };
  initAccountNames: (accounts: Account[]) => Promise<void>;
  changeAccountName: (account: Account, name: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const useAccountName = (): UseAccountNameReturn => {
  const { accountService } = useAdenaContext();
  const [accountNames, setAccountNames] = useRecoilState(WalletState.accountNames);

  const initAccountNames = async (accounts: Account[]): Promise<void> => {
    const storedAccountNames = await accountService.getAccountNames();
    const accountNames: { [key in string]: string } = {};
    for (const account of accounts) {
      accountNames[account.id] = account.name;
    }
    const changedAccountNames = { ...accountNames, ...storedAccountNames };
    setAccountNames(changedAccountNames);
    await accountService.updateAccountNames(changedAccountNames);
  };

  const changeAccountName = async (account: Account, name: string): Promise<void> => {
    const changedAccountNames = {
      ...accountNames,
      [account.id]: name || account.name,
    };
    setAccountNames(changedAccountNames);
    await accountService.updateAccountNames(changedAccountNames);
  };

  const clear = async (): Promise<void> => {
    setAccountNames({});
    await accountService.deleteAccountNames();
  };

  return {
    accountNames,
    initAccountNames,
    changeAccountName,
    clear,
  };
};
