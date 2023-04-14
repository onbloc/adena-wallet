import { useRecoilState, useResetRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useAdenaContext } from './use-context';
import { SeedAccount } from 'adena-module';

export const useAddAccount = (): {
  availAddAccount: () => Promise<boolean>;
  addAccount: () => Promise<boolean>;
} => {
  const { walletService, accountService } = useAdenaContext();
  const [, setAccounts] = useRecoilState(WalletState.accounts);
  const [, setState] = useRecoilState(WalletState.state);
  const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);

  const availAddAccount = async () => {
    const isExists = await walletService.existsWallet();
    return isExists;
  };

  const addAccount = async () => {
    setState("LOADING");
    const maxPath = await accountService.getAddedAccountPath();
    const maxIndex = await accountService.getLastAccountIndex();
    const accountNumber = await accountService.getAddedAccountNumber();
    clearCurrentBalance();

    const wallet = await walletService.loadWallet();
    const createdAccount = await SeedAccount.createByWallet(wallet);
    createdAccount.index = maxIndex + 1;
    createdAccount.name = `Account ${accountNumber}`;
    wallet.addAccount(createdAccount);

    await accountService.updateLastAccountPath(maxPath);
    await accountService.addAccount(createdAccount);
    await accountService.changeCurrentAccount(createdAccount);
    setAccounts(wallet.accounts);
    return true;
  };

  return { availAddAccount, addAccount };
};
