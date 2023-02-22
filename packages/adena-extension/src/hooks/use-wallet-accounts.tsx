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
    await accountService.updateAccounts(walletAccounts);
    setWalletAccounts(walletAccounts);
  };

  const addAccount = async (walletAccount: InstanceType<typeof WalletAccount>) => {
    const accounts = walletAccounts ?? [];
    const addedAccounts = [...accounts, walletAccount];
    await saveAccounts(addedAccounts);
    // await changeCurrentAccount(walletAccount.getAddress(), addedAccounts);
  };

  const getCurrentAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
    const accounts = await accountService.getAccounts();
    return accounts;
  };

  return {
    accounts: walletAccounts,
    initAccounts,
    saveAccounts,
    addAccount
  };
};
