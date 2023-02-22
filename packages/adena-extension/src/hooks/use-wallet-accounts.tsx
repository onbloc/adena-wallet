import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { Wallet, WalletAccount } from 'adena-module';
import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useEffect } from 'react';

export const useWalletAccounts = (
  wallet: InstanceType<typeof Wallet> | null,
): {
  accounts: Array<InstanceType<typeof WalletAccount>> | null,
  initAccounts: () => Promise<void>,
  saveAccounts: (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => Promise<void>,
  addAccount: (walletAccount: InstanceType<typeof WalletAccount>) => Promise<void>,
} => {
  const { accountService } = useAdenaContext();
  const [walletAccounts, setWalletAccounts] = useRecoilState(WalletState.accounts);
  const [, , changeCurrentAccount] = useCurrentAccount();

  useEffect(() => {
    console.log(walletAccounts);
  }, [walletAccounts]);

  const initAccounts = async () => {
    if (!wallet) {
      return;
    }

    const walletInstance = wallet.clone();
    await walletInstance.initAccounts();
    const accounts = await getCurrentAccounts(walletInstance.getAccounts());
    saveAccounts(accounts);
  };

  const saveAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
    await accountService.saveAccounts(walletAccounts);
    setWalletAccounts(walletAccounts);
  };

  const addAccount = async (walletAccount: InstanceType<typeof WalletAccount>) => {
    const accounts = walletAccounts ?? [];
    const addedAccounts = [...accounts, walletAccount];
    await saveAccounts(addedAccounts);
    await changeCurrentAccount(walletAccount.getAddress(), addedAccounts);
  };

  const getCurrentAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
    const accounts = await accountService.loadAccounts();
    const filteredAccounts = accounts.filter(account => {
      if (account.data.accountType === 'NONE') {
        return false;
      }
      return true;
    });
    const createdAccounts = walletAccounts.filter(walletAccount => accounts.find(account => account.getAddress() === walletAccount.getAddress()) === undefined);
    return accountService.changeAccountsByAccountNames([...filteredAccounts, ...createdAccounts]);
  };

  return {
    accounts: walletAccounts,
    initAccounts,
    saveAccounts,
    addAccount
  };
};
