import { useWalletCreator } from './use-wallet-creator';
import { WalletService } from '@services/index';
import { useWallet } from './use-wallet';
import { useRecoilState, useResetRecoilState } from 'recoil';
import { WalletState } from '@states/index';

export const useWalletAccountPathController = (): [
  increaseAccountPaths: () => void,
  decreaseAccountPaths: () => void,
] => {
  const [, createWallet] = useWalletCreator();
  const [wallet] = useWallet();
  const [, setState] = useRecoilState(WalletState.state);
  const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);

  const increaseAccountPaths = async () => {
    await WalletService.increaseWalletAccountPaths();
    await reloadWallet();
  };

  const decreaseAccountPaths = async () => {
    await WalletService.decreaseWalletAccountPaths();
    await reloadWallet();
  };

  const reloadWallet = async () => {
    if (wallet) {
      setState('LOADING');
      clearCurrentBalance();
      const mnemonic = wallet.getMnemonic();
      const password = await WalletService.loadWalletPassword();
      await createWallet({ mnemonic, password });
    }
  };

  return [increaseAccountPaths, decreaseAccountPaths];
};
