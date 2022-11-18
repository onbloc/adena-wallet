import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { WalletService } from '@services/index';
import { WalletError } from '@common/errors';

/**
 * Load or Deserialize wallet  by saved serialized wallet data
 *
 * @returns
 *  - state: wallet load statement
 *  - load: load wallet
 *  - loadByPassowrd: load wallet by password
 */

export const useWalletLoader = (): [
  state: string,
  loadWallet: () => void,
  loadWalletByPassword: (password: string) => Promise<"CREATE" | "LOGIN" | "FAIL" | "FINISH">,
] => {
  const [state, setState] = useRecoilState(WalletState.state);
  const [, setWallet] = useRecoilState(WalletState.wallet);
  const [, setWalletAccounts] = useRecoilState(WalletState.accounts);

  const loadWallet = async () => {
    setState('LOADING');
    try {
      const loadedWallet = await WalletService.loadWallet();
      await loadedWallet.initAccounts();
      setWallet(loadedWallet);
      setWalletAccounts(loadedWallet.getAccounts());
      setState('FINISH');

    } catch (error) {
      if (error instanceof WalletError) {
        const changedState = getStateByWalletError(error);
        setState(changedState);
      } else {
        console.error(error)
        setState('FAIL');
      }
    }
  };

  const loadWalletByPassword = async (password: string) => {
    setState('LOADING');
    try {
      const loadedWallet = await WalletService.loadWalletWithPassword(password);
      await loadedWallet.initAccounts();
      setWallet(loadedWallet);
      setWalletAccounts(loadedWallet.getAccounts());
      setState('FINISH');
      return 'FINISH';
    } catch (error) {
      let changedState: "CREATE" | "LOGIN" | "FAIL" = 'FAIL';
      if (error instanceof WalletError) {
        changedState = getStateByWalletError(error);
        setState(changedState);
      } else {
        setState(changedState);
      }
      return changedState;
    }
  };

  const getStateByWalletError = (error: WalletError) => {
    switch (error.getType()) {
      case 'NOT_FOUND_SERIALIZED':
        return 'CREATE';
      case 'NOT_FOUND_PASSWORD':
      case 'FAILED_TO_LOAD':
        return 'LOGIN';
      default:
        break;
    }
    return 'FAIL';
  };

  return [state, loadWallet, loadWalletByPassword];
};
