import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';

import { CommonState } from '@states';

/**
 * Declares demand for the per-account native balance map while `active` holds.
 * The map costs one balance RPC per account, so `useTokenBalance` keeps it
 * disabled until a surface that renders it says otherwise.
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

/** True while any surface has declared demand. Gates the query in `useTokenBalance`. */
export const useHasAccountBalanceMapDemand = (): boolean => {
  return useRecoilValue(CommonState.accountBalanceMapDemand) > 0;
};
