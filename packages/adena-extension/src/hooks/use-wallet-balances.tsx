import { CommonState, WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useGnoClient } from './use-gno-client';
import { useEffect } from 'react';
import { useTokenConfig } from './use-token-config';
import { Balance } from '@states/wallet';
import { WalletService } from '@services/index';

export const useWalletBalances = (
  initialize?: boolean,
): [balances: Array<Balance>, updateBalances: () => void] => {
  const [gnoClient, ,] = useGnoClient();
  const [currentAccount] = useRecoilState(WalletState.currentAccount);
  const [balances, setBalances] = useRecoilState(WalletState.balances);
  const [getTokenConfig] = useTokenConfig();
  const [, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);

  useEffect(() => {
    if (initialize) {
      updateBalances();
    }
  }, [gnoClient, currentAccount?.getAddress()]);


  const updateBalances = async () => {
    if (currentAccount && gnoClient) {
      const tokenConfigs = await getTokenConfig();
      try {
        const tokenBalances = await WalletService.getTokenBalances(gnoClient, currentAccount.getAddress(), tokenConfigs);

        if (tokenBalances.length > 0) {
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
