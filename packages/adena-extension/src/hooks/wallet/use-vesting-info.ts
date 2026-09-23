import { useMemo } from 'react';

import { parseVestingSchedule, VestingInfo } from '@common/utils/vesting-utils';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGetAccountInfo } from '@hooks/wallet/use-get-account-info';

// Matches the Gno balance poll on the main screen: the schedule itself never
// moves, but the account's coins do, and both figures are shown side by side.
const VESTING_REFETCH_INTERVAL = 5_000;

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
    // `useGetAccountInfo` keeps previous data by default. Here that would hand
    // back the PREVIOUS account's schedule and coins while the newly selected
    // account's request is still in flight — and with `isLoading` false, so
    // nothing downstream could tell. The main balance is fetched separately
    // and switches immediately, so the panel would be splitting one account's
    // balance by another's grant. A refetch on an unchanged key still keeps
    // its own data on screen; only the cross-account carry-over is dropped.
    keepPreviousData: false,
  });

  const vestingInfo = useMemo<VestingInfo | null>(() => {
    if (!accountInfo) {
      return null;
    }

    // Belt-and-braces against the same carry-over: whatever the cache hands
    // back, only ever break down the account actually on screen. `address` is
    // echoed by the provider from the query it answered.
    if (accountInfo.address !== currentBalanceAddress) {
      return null;
    }

    const schedule = parseVestingSchedule(accountInfo.vesting);
    if (!schedule) {
      return null;
    }

    return { schedule, coins: accountInfo.coins };
  }, [accountInfo, currentBalanceAddress]);

  return { vestingInfo, isLoading };
};
