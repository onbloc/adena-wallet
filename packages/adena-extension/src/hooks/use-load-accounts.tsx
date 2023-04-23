import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useWalletContext } from './use-context';
import { Account } from 'adena-module';
import { useWalletAccounts } from './use-wallet-accounts';

export const useLoadAccounts = () => {
  const { wallet, initWallet } = useWalletContext();
  const { accounts } = useWalletAccounts();
  const [state] = useRecoilState(WalletState.state);

  const loadAccounts = async () => {
    return initWallet();
  };

  const addAccounts = async (addedAccounts: Array<Account>) => {
    if (!wallet) {
      return false;
    }
    for (const account of addedAccounts) {
      wallet.addAccount(account);
    }
    initWallet();
    return true;
  };

  return { state, accounts, loadAccounts, addAccounts };
};
