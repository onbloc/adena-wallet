import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { Wallet } from 'adena-module';
import { useWalletLoader } from './use-wallet-loader';

/**
 * Get wallet and load state.
 *
 * @returns
 *  - wallet: wallet instance
 *  - state: wallet load statement
 */

export const useWallet = (): [
  wallet: InstanceType<typeof Wallet> | null,
  state: string,
  loadWallet: () => void,
] => {
  const [state, loadWallet] = useWalletLoader();

  return [null, state, loadWallet];
};
