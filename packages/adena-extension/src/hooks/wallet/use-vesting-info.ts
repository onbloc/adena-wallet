import { useMemo } from 'react';

import { parseVestingSchedule, VestingInfo } from '@common/utils/vesting-utils';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGetAccountInfo } from '@hooks/wallet/use-get-account-info';

// Matches the Gno balance poll on the main screen: the schedule itself never
// moves, but the account's coins do, and both figures are shown side by side.
const VESTING_REFETCH_INTERVAL = 5_000;

/**
 * Vesting schedule of an account, or null when it has no grant — which is
 * every account on the chain but a handful.
 *
 * Defaults to the account whose balance the main screen shows. Callers that
 * care about a different one — the transfer screen caps a send by what the
 * FUNDING address may move — pass it explicitly; `null` disables the query.
 *
 * Only accounts that turn out to have a schedule keep polling; for everyone
 * else this settles into a single query and then goes quiet.
 */
export const useVestingInfo = (
  address?: string | null,
): {
  vestingInfo: VestingInfo | null;
  isLoading: boolean;
  /**
   * Whether the account was actually read. `getAccountInfo` answers a failed
   * RPC with an IN_ACTIVE placeholder that carries no `vesting` field, which
   * reads exactly like an account that simply has no grant. A caller that must
   * not under-report a lock needs to tell the two apart.
   */
  isResolved: boolean;
} => {
  const { currentBalanceAddress } = useCurrentAccount();
  const targetAddress = address === undefined ? currentBalanceAddress : address;

  const { data: accountInfo, isLoading } = useGetAccountInfo(targetAddress, {
    // Poll a grant, because its split moves every block — but also poll an
    // account that could not be read. `getAccountInfo` answers a failed RPC
    // with an IN_ACTIVE placeholder rather than rejecting, so that answer is
    // not an answer: without a retry a caller that holds back on "unknown"
    // would hold back for as long as the screen stays open.
    refetchInterval: (data) =>
      data?.vesting || (data && data.status !== 'ACTIVE') ? VESTING_REFETCH_INTERVAL : false,
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
    if (accountInfo.address !== targetAddress) {
      return null;
    }

    const schedule = parseVestingSchedule(accountInfo.vesting);
    if (!schedule) {
      return null;
    }

    return { schedule, coins: accountInfo.coins };
  }, [accountInfo, targetAddress]);

  const isResolved = useMemo(
    () => !!accountInfo && accountInfo.address === targetAddress && accountInfo.status === 'ACTIVE',
    [accountInfo, targetAddress],
  );

  return { vestingInfo, isLoading, isResolved };
};
