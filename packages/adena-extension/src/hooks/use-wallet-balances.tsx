import { CommonState, WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useGnoClient } from './use-gno-client';
import { useEffect } from 'react';
import { Balance } from '@states/wallet';
import { useAdenaContext } from './use-context';
import BigNumber from 'bignumber.js';
import { GnoClient } from 'gno-client';
import { CommonError } from '@common/errors/common';

export const useWalletBalances = (
  gnoClient: InstanceType<typeof GnoClient> | null
): [balances: Array<Balance>, updateBalances: (address: string) => void] => {
  const { balanceService } = useAdenaContext();

  const [balances, setBalances] = useRecoilState(WalletState.balances);
  const [, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);

  const updateBalances = async (address: string) => {
    if (!gnoClient) {
      console.log("Not initialize gno client");
      return;
    }

    try {
      const tokenBalances = await balanceService.getTokenBalances(address);
      if (tokenBalances.length > 0) {
        setBalances(tokenBalances as Array<Balance>);
      } else {
        setFailedNetwork(false);
      }
    } catch (e) {
      if (e instanceof CommonError) {
        console.log(e);
      } else {
        setFailedNetwork(true);
      }
    }
  };

  return [balances, updateBalances];
};
