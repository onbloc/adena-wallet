import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { WalletError } from '@common/errors';
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

  const validateWallet = async () => {
    const existWallet = await walletService.existsWallet();
    if (existWallet) {
      return true;
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
    const currentAccount = await accountService.getCurrentAccount();
    if (!currentAccount) {
      await accountService.updateCurrentAccount(address);
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
