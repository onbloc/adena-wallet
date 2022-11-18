import { useWalletCreator } from './use-wallet-creator';
import { WalletService } from '@services/index';
import { useWallet } from './use-wallet';

export const useWalletAccountPathController = (): [
  increaseAccountPaths: () => void,
  decreaseAccountPaths: () => void,
] => {
  const [, createWallet] = useWalletCreator();
  const [wallet] = useWallet();

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
      const mnemonic = wallet.getMnemonic();
      const password = await WalletService.loadWalletPassword();
      await createWallet({ mnemonic, password });
    }
  };

  return [increaseAccountPaths, decreaseAccountPaths];
};
