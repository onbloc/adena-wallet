import { BalanceState, CommonState, NetworkState, WalletState } from '@states';
import { useQueryClient } from '@tanstack/react-query';
import { useResetRecoilState, useSetRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';

export type UseClearReturn = {
  clear: () => Promise<boolean>;
};

export const useClear = (): UseClearReturn => {
  const {
    walletService,
    accountService,
    addressBookService,
    chainService,
    establishService,
    tokenService,
  } = useAdenaContext();
  const queryClient = useQueryClient();
  const clearCurrentAccount = useResetRecoilState(WalletState.currentAccount);
  const setWalletState = useSetRecoilState(WalletState.state);
  const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);
  const clearHistoryPosition = useResetRecoilState(CommonState.historyPosition);
  const clearCurrentNetwork = useResetRecoilState(NetworkState.currentNetwork);
  const clearIsLoading = useResetRecoilState(BalanceState.isLoading);
  const clearAccountTokenBalances = useResetRecoilState(BalanceState.accountTokenBalances);
  const clearAddressBook = useResetRecoilState(WalletState.addressBook);

  const clear = async (): Promise<boolean> => {
    setWalletState('CREATE');
    clearTransactionHistory();
    clearHistoryPosition();
    clearCurrentAccount();
    clearIsLoading();
    clearAccountTokenBalances();
    clearCurrentNetwork();
    clearAddressBook();
    await walletService.clear();
    await accountService.clear();
    await addressBookService.clear();
    await chainService.clear();
    await establishService.clear();
    await tokenService.clear();
    queryClient.clear();
    return true;
  };

  return { clear };
};
