import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useAdenaContext, useWalletContext } from './use-context';
import { SeedAccount } from 'adena-module';

export const useAddAccount = (): {
  availAddAccount: () => Promise<boolean>;
  addAccount: () => Promise<boolean>;
} => {
  const { wallet } = useWalletContext();
  const { walletService, accountService } = useAdenaContext();
  const [, setState] = useRecoilState(WalletState.state);

  const availAddAccount = async () => {
    const isExists = await walletService.existsWallet();
    return isExists;
  };

  const addAccount = async () => {
    if (!wallet) {
      return false;
    }
    setState("LOADING");

    const account = await SeedAccount.createByWallet(wallet);
    wallet.addAccount(account);
    await accountService.changeCurrentAccount(account);
    return true;
  };

  return { availAddAccount, addAccount };
};
