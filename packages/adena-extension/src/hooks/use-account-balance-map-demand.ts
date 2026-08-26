import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';

import { CommonState } from '@states';

/**
 * Registers the caller as a consumer of the per-account native balance map for
 * as long as `active` stays true.
 *
 * The map issues one balance RPC per account, so it must not run in the
 * background. Only the surfaces that actually render it — the side menu while
 * it is open, and the accounts screen — declare demand, and `useTokenBalance`
 * keeps the query disabled while the count is zero.
 */
export const useAccountBalanceMapDemand = (active: boolean): void => {
  const setDemand = useSetRecoilState(CommonState.accountBalanceMapDemand);

  useEffect(() => {
    if (!active) {
      return;
    }

    setDemand((count) => count + 1);
    return (): void => {
      setDemand((count) => Math.max(0, count - 1));
    };
  }, [active, setDemand]);
};

/**
 * True while any surface has declared demand for the per-account native balance
 * map. Read by `useTokenBalance` to gate the query.
 */
export const useHasAccountBalanceMapDemand = (): boolean => {
  return useRecoilValue(CommonState.accountBalanceMapDemand) > 0;
};
