import { useWalletCreator } from './use-wallet-creator';
import { useWallet } from './use-wallet';
import { useRecoilState, useResetRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useAdenaContext } from './use-context';

export const useWalletAccountPathController = (): [
  increaseAccountPaths: () => void,
  decreaseAccountPaths: () => void,
] => {
  const { walletService, accountService } = useAdenaContext();
  const [, createWallet] = useWalletCreator();
  const [wallet] = useWallet();
  const [, setState] = useRecoilState(WalletState.state);
  const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);

  const increaseAccountPaths = async () => {
    // await accountService.();
    await reloadWallet();
  };

  const decreaseAccountPaths = async () => {
    // await accountService.decreaseWalletAccountPaths();
    await reloadWallet();
  };

  const reloadWallet = async () => {
    if (wallet) {
      setState('LOADING');
      clearCurrentBalance();
      const mnemonic = wallet.getMnemonic();
      const password = await walletService.loadWalletPassword();
      await createWallet({ mnemonic, password });
    }
  };

  return [increaseAccountPaths, decreaseAccountPaths];
};
