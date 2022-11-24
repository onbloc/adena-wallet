import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { Wallet, WalletAccount } from 'adena-module';
import { WalletService } from '@services/index';
import { useGnoClient } from './use-gno-client';
import { useCurrentAccount } from './use-current-account';

export const useWalletAccounts = (
  wallet: InstanceType<typeof Wallet> | null,
): [
    walletAccounts: Array<InstanceType<typeof WalletAccount>> | null,
    updateWalletAccounts: () => Promise<Array<InstanceType<typeof WalletAccount>>>,
  ] => {
  const [gnoCliet] = useGnoClient();
  const [walletAccounts, setWalletAccounts] = useRecoilState(WalletState.accounts);
  const [, , changeCurrentAccount] = useCurrentAccount();

  const updateWalletAccounts = async () => {
    if (!wallet || !gnoCliet) {
      return walletAccounts ?? [];
    }

    const accounts = await WalletService.loadAccounts(wallet, gnoCliet.config);
    changeCurrentAccount(null, accounts);
    setWalletAccounts(accounts);
    return accounts;
  };

  return [walletAccounts, updateWalletAccounts];
};
