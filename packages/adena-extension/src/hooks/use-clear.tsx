import { CommonState, GnoClientState, WalletState } from '@states/index';
import { useResetRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';

export const useClear = () => {
  const { walletService, accountService } = useAdenaContext();

  const clearCurrentAccount = useResetRecoilState(WalletState.currentAccount);
  const clearState = useResetRecoilState(WalletState.state);
  const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);
  const clearHistoryPosition = useResetRecoilState(CommonState.historyPosition);
  const clearGnoClient = useResetRecoilState(GnoClientState.current);
  const clearNetworks = useResetRecoilState(GnoClientState.networks);

  const clear = async () => {
    clearState();
    clearTransactionHistory();
    clearHistoryPosition();
    clearGnoClient();
    clearNetworks();
    clearCurrentAccount();
    await walletService.clear();
    await accountService.clear();
    return true;
  };

  return { clear };
};
