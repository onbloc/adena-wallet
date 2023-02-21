import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { Wallet, WalletAccount } from 'adena-module';
import { useGnoClient } from './use-gno-client';
import { useAdenaContext } from './use-context';

export const useWalletAccounts = (
  wallet: InstanceType<typeof Wallet> | null,
): {
  accounts: Array<InstanceType<typeof WalletAccount>> | null,
  initAccounts: () => Promise<void>,
  saveAccounts: (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => Promise<void>,
  addAccount: (walletAccount: InstanceType<typeof WalletAccount>) => Promise<void>,
} => {
  const { accountService } = useAdenaContext();
  const [gnoCliet] = useGnoClient();
  const [walletAccounts, setWalletAccounts] = useRecoilState(WalletState.accounts);

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
    saveAccounts(addedAccounts);
  };

  const getCurrentAccounts = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
    const accounts = await accountService.loadAccounts();
    const filteredAccounts = accounts.filter(account => {
      if (account.data.signerType === 'LEDGER') {
        return true;
      }
      if (walletAccounts.find(walletAccount => walletAccount.getAddress() === account.getAddress())) {
        return true;
      }
      return false;
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
