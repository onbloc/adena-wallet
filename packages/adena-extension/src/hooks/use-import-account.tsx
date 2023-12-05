import { useRecoilState } from 'recoil';
import { Account, Keyring } from 'adena-module';
import { WalletState } from '@states/index';
import { useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';

export type UseImportAccountReturn = {
  importAccount: (account: Account, keyring: Keyring) => Promise<boolean>;
};

export const useImportAccount = (): UseImportAccountReturn => {
  const { wallet, updateWallet } = useWalletContext();
  const [, setState] = useRecoilState(WalletState.state);
  const { changeCurrentAccount } = useCurrentAccount();

  const importAccount = async (account: Account, keyring: Keyring): Promise<boolean> => {
    if (!wallet) {
      return false;
    }
    setState('LOADING');
    account.index = wallet.lastAccountIndex + 1;
    account.name = `Account ${account.index}`;
    const clone = wallet.clone();
    clone.addAccount(account);
    clone.addKeyring(keyring);
    const storedAccount = clone.accounts.find((storedAccount) => storedAccount.id === account.id);
    if (storedAccount) {
      await changeCurrentAccount(storedAccount);
    }
    await updateWallet(clone);
    setState('FINISH');
    return true;
  };

  return { importAccount };
};
