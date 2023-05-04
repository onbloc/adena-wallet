import { BalanceState, CommonState, GnoClientState, NetworkState, WalletState } from '@states/index';
import { useResetRecoilState, useSetRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';

export const useClear = () => {
  const {
    walletService,
    accountService,
    addressBookService,
    chainService,
    establishService,
    tokenService,
  } = useAdenaContext();
  const clearCurrentAccount = useResetRecoilState(WalletState.currentAccount);
  const setWalletState = useSetRecoilState(WalletState.state);
  const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);
  const clearHistoryPosition = useResetRecoilState(CommonState.historyPosition);
  const clearGnoClient = useResetRecoilState(GnoClientState.current);
  const clearNetworks = useResetRecoilState(GnoClientState.networks);
  const clearCurrentNetwork = useResetRecoilState(NetworkState.currentNetwork);
  const clearFailedNetwork = useResetRecoilState(CommonState.failedNetwork);
  const clearIsLoading = useResetRecoilState(BalanceState.isLoading);
  const clearAccountTokenBalances = useResetRecoilState(BalanceState.accountTokenBalances);

  const clear = async () => {
    setWalletState('CREATE');
    clearTransactionHistory();
    clearHistoryPosition();
    clearGnoClient();
    clearNetworks();
    clearCurrentAccount();
    clearIsLoading();
    clearAccountTokenBalances();
    clearCurrentNetwork();
    clearFailedNetwork();
    await walletService.clear();
    await accountService.clear();
    await addressBookService.clear();
    await chainService.clear();
    await establishService.clear();
    await tokenService.clear();
    return true;
  };

  return { clear };
};
