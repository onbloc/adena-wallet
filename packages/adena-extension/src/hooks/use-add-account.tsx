import { useRecoilState, useResetRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useAdenaContext } from './use-context';

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
    const mnemonic = wallet.getMnemonic();

    const createdWallet = await walletService.createWalletByMnemonic(mnemonic, [maxPath]);
    await createdWallet.initAccounts();
    const createdAccounts = createdWallet.getAccounts();
    if (createdAccounts.length > 0) {
      const createdAccount = createdAccounts[0];
      createdAccount.setIndex(maxIndex + 1);
      createdAccount.setName(`Account ${accountNumber}`);
      createdAccount.setSigner(createdWallet);
      await accountService.updateLastAccountPath(maxPath);
      await accountService.addAccount(createdAccount);
      await accountService.changeCurrentAccount(createdAccount);
    }
    const accounts = await accountService.getAccounts();
    setAccounts(accounts);
    return true;
  };

  return { availAddAccount, addAccount };
};
