import { useRecoilState, useResetRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useAdenaContext } from './use-context';

export const useAddAccount = (): {
  availAddAccount: () => Promise<boolean>,
  addAccount: () => Promise<boolean>,
} => {
  const { walletService, accountService } = useAdenaContext();
  const [, setAccounts] = useRecoilState(WalletState.accounts);
  const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);

  const availAddAccount = async () => {
    const isExists = await walletService.existsWallet();
    return isExists;
  };

  const addAccount = async () => {
    const currentAccounts = await accountService.getAccounts();
    const accountPaths = currentAccounts
      .filter(account => account.data.accountType === "SEED")
      .map(account => account.data.path);
    const maxPath = Math.max(...accountPaths);

    const wallet = await walletService.loadWallet();
    const mnemonic = wallet.getMnemonic();
    const createdWallet = await walletService.createWalletByMnemonic(mnemonic, [maxPath + 1]);
    await createdWallet.initAccounts();

    const createdAccounts = createdWallet.getAccounts();
    if (createdAccounts.length > 0) {
      const accountIndex = maxPath + 2;
      const createdAccount = createdAccounts[0];
      createdAccount.setIndex(accountIndex);
      createdAccount.setName(`Account ${accountIndex}`);
      await accountService.addAccount(createdAccount);
      await accountService.changeCurrentAccount(createdAccount);
    }
    clearCurrentBalance();
    accountService.getAccounts().then(setAccounts);
    return true;
  };

  return { availAddAccount, addAccount };
};
