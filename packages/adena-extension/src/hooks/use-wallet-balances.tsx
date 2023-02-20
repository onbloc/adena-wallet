import { CommonState, WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useGnoClient } from './use-gno-client';
import { useEffect } from 'react';
import { Balance } from '@states/wallet';
import { useAdenaContext } from './use-context';

export const useWalletBalances = (
  initialize?: boolean,
): [balances: Array<Balance>, updateBalances: () => void] => {
  const { balanceService } = useAdenaContext();

  const [gnoClient, ,] = useGnoClient();
  const [currentAccount] = useRecoilState(WalletState.currentAccount);
  const [balances, setBalances] = useRecoilState(WalletState.balances);
  const [, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);

  useEffect(() => {
    if (initialize) {
      updateBalances();
    }
  }, [gnoClient, currentAccount?.getAddress()]);


  const updateBalances = async () => {
    if (currentAccount && gnoClient) {
      try {
        const tokenBalances = await balanceService.getTokenBalances(currentAccount.getAddress());

        if (tokenBalances && tokenBalances.length > 0) {
          setBalances(tokenBalances as Array<Balance>);
          setFailedNetwork(false);
        }
      } catch (e) {
        setFailedNetwork(true);
      }
    }
  };

  return [balances, updateBalances];
};
