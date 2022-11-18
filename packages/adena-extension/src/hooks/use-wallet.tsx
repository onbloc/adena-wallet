import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { Wallet } from 'adena-wallet';
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
  const [wallet] = useRecoilState(WalletState.wallet);
  const [state, loadWallet] = useWalletLoader();

  return [wallet, state, loadWallet];
};
