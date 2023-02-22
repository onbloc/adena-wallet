import { CommonState, GnoClientState, WalletState } from '@states/index';
import { useResetRecoilState } from 'recoil';
import { useAdenaContext } from './use-context';

export const useClear = () => {
  const { walletService, accountService } = useAdenaContext();

  const clearAccounts = useResetRecoilState(WalletState.accounts);
  const clearState = useResetRecoilState(WalletState.state);
  const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);
  const clearHistoryPosition = useResetRecoilState(CommonState.historyPosition);
  const clearGnoClient = useResetRecoilState(GnoClientState.current);
  const clearNetworks = useResetRecoilState(GnoClientState.networks);

  const clear = async () => {
    clearAccounts();
    clearState();
    clearTransactionHistory();
    clearHistoryPosition();
    clearGnoClient();
    clearNetworks();
    await walletService.clear();
    await accountService.clear();
    return true;
  };

  return { clear };
};
