import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { WalletService } from '@services/index';
import { WalletError } from '@common/errors';
import { WalletRepository } from '@repositories/wallet';
import { useAdenaContext } from './use-context';

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
  const { walletService, accountService } = useAdenaContext();
  const [state, setState] = useRecoilState(WalletState.state);
  const [, setWallet] = useRecoilState(WalletState.wallet);
  const [, setWalletAccounts] = useRecoilState(WalletState.accounts);

  const validateWallet = async () => {
    try {
      const existWallet = await walletService.existsWallet();
      if (existWallet) {
        return true;
      }
      return true;
    } catch (e) {
      console.log(e);
    }
    setState('CREATE');
    return false;
  }

  const loadWallet = async () => {
    if (!await validateWallet()) {
      return;
    }
    setState('LOADING');
    try {
      const loadedWallet = await walletService.loadWallet();
      await loadedWallet.initAccounts();
      await initCurrentAccountAddress(loadedWallet.getAccounts()[0]?.getAddress());
      setWallet(loadedWallet);
      setWalletAccounts(loadedWallet.getAccounts());
      setState('FINISH');
    } catch (error) {
      console.log(error);
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
    if (!await validateWallet()) {
      return 'CREATE';
    }
    setState('LOADING');
    try {
      const loadedWallet = await walletService.loadWalletWithPassword(password);
      await loadedWallet.initAccounts();
      await initCurrentAccountAddress(loadedWallet.getAccounts()[0]?.getAddress());
      setWallet(loadedWallet);
      setWalletAccounts(loadedWallet.getAccounts());
      setState('FINISH');
      return 'FINISH';
    } catch (error) {
      console.log(error)
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

  const initCurrentAccountAddress = async (address: any) => {
    const currentAccountAddress = await accountService.loadCurrentAccountAddress();
    if (!currentAccountAddress) {
      await accountService.saveCurrentAccountAddress(address);
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
