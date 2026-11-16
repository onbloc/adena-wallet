import { BalanceState, CommonState, NetworkState, WalletState } from '@states';
import { useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useResetAtom } from 'jotai/utils';
import { clearTokenOrderCache } from './helpers/token-order-cache';
import { useAdenaContext } from './use-context';
import useExtensionWindowManager from './use-extension-window-manager';

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
    sessionRepository,
    tokenService,
  } = useAdenaContext();
  const queryClient = useQueryClient();
  const clearCurrentAccount = useResetAtom(WalletState.currentAccount);
  const setWalletState = useSetAtom(WalletState.state);
  const clearTransactionHistory = useResetAtom(WalletState.transactionHistory);
  const clearHistoryPosition = useResetAtom(CommonState.historyPosition);
  const clearCurrentNetwork = useResetAtom(NetworkState.currentNetwork);
  const clearIsLoading = useResetAtom(BalanceState.isLoading);
  const clearAccountTokenBalances = useResetAtom(BalanceState.accountTokenBalances);
  const clearAddressBook = useResetAtom(WalletState.addressBook);

  const { closeAllExtensionWindows } = useExtensionWindowManager();

  const clear = async (): Promise<boolean> => {
    setWalletState('CREATE');
    clearTransactionHistory();
    clearHistoryPosition();
    clearCurrentAccount();
    clearIsLoading();
    clearAccountTokenBalances();
    clearCurrentNetwork();
    clearAddressBook();
    // Awaited: the other windows run their own JavaScript contexts, and a
    // token order write started in one of them would otherwise be free to
    // land after the caches below are cleared.
    await closeAllExtensionWindows();
    await walletService.clear();
    await accountService.clear();
    await addressBookService.clear();
    await chainService.clear();
    await establishService.clear();
    await sessionRepository.clear();
    await tokenService.clear();
    // Keyed by account id, so the ids outlive the wallet unless dropped here.
    await clearTokenOrderCache();
    queryClient.clear();
    return true;
  };

  return { clear };
};
