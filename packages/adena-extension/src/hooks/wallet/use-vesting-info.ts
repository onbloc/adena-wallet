import { useMemo } from 'react';

import { parseVestingSchedule, VestingSchedule } from '@common/utils/vesting-utils';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGetAccountInfo } from '@hooks/wallet/use-get-account-info';

// Matches the Gno balance poll on the main screen: the schedule itself never
// moves, but the account's coins do, and both figures are shown side by side.
const VESTING_REFETCH_INTERVAL = 5_000;

export interface VestingInfo {
  schedule: VestingSchedule;
  /** Raw amino coin string for the account, e.g. "110294549738ugnot". */
  coins: string;
}

/**
 * Vesting schedule of the account whose balance the main screen shows, or null
 * when it has no grant — which is every account on the chain but a handful.
 *
 * Only accounts that turn out to have a schedule keep polling; for everyone
 * else this settles into a single query and then goes quiet.
 */
export const useVestingInfo = (): {
  vestingInfo: VestingInfo | null;
  isLoading: boolean;
} => {
  const { currentBalanceAddress } = useCurrentAccount();

  const { data: accountInfo, isLoading } = useGetAccountInfo(currentBalanceAddress, {
    refetchInterval: (data) => (data?.vesting ? VESTING_REFETCH_INTERVAL : false),
  });

  const vestingInfo = useMemo<VestingInfo | null>(() => {
    if (!accountInfo) {
      return null;
    }

    const schedule = parseVestingSchedule(accountInfo.vesting);
    if (!schedule) {
      return null;
    }

    return { schedule, coins: accountInfo.coins };
  }, [accountInfo]);

  return { vestingInfo, isLoading };
};
