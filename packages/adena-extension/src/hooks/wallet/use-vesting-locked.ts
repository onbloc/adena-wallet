import BigNumber from 'bignumber.js';
import { useMemo } from 'react';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { getVestedAmount } from '@common/utils/vesting-utils';
import { useChainBlockTime } from '@hooks/wallet/use-chain-block-time';
import { useVestingInfo } from '@hooks/wallet/use-vesting-info';

// Matches the grant poll in `useVestingInfo`: a linear schedule releases coins
// on every block, so the lock has to keep shrinking while the screen is open.
const VESTING_BLOCK_TIME_INTERVAL = 5_000;

export interface VestingLocked {
  /**
   * GNOT the grant still locks, in display units, or null when nothing locks
   * the balance — no grant, or the caller disabled the lookup.
   *
   * Deliberately the lock rather than a spendable figure: the account's balance
   * is read separately by whoever needs it, and two snapshots of it can
   * disagree. The lock depends only on the schedule and the clock, so the
   * caller can subtract it from the very balance it is about to spend.
   */
  lockedAmount: BigNumber | null;
  /**
   * True until the lock is known. Callers must not read that as "nothing
   * locked": an unread grant looks exactly like an account that has none.
   */
  isLoading: boolean;
}

/**
 * How much of `address`'s GNOT its vesting grant still locks.
 *
 * Only the transfer is restricted. Gas fees and storage deposits are debited
 * without consulting the lock, so they can be paid out of locked coins — but
 * that debit does not release any, so whatever remains afterwards still has to
 * cover the lock. Callers therefore take the fee off the capped amount, not
 * off the balance before capping.
 */
export const useVestingLocked = (
  address: string | null | undefined,
  enabled = true,
): VestingLocked => {
  const active = enabled && !!address;
  const { vestingInfo, isLoading, isResolved } = useVestingInfo(active ? address : null);
  const blockTimeSec = useChainBlockTime(active && !!vestingInfo, VESTING_BLOCK_TIME_INTERVAL);

  return useMemo(() => {
    if (!active) {
      return { lockedAmount: null, isLoading: false };
    }

    // A failed account read answers with an IN_ACTIVE placeholder that carries
    // no grant, so "not read" has to be held open rather than taken as "not
    // locked" — otherwise one bad response uncaps the send.
    if (isLoading || !isResolved) {
      return { lockedAmount: null, isLoading: true };
    }

    if (!vestingInfo) {
      return { lockedAmount: null, isLoading: false };
    }

    // Vesting is enforced at `ctx.BlockTime()`, so wait for the chain's clock
    // rather than falling back to the device's, which may run ahead of it and
    // report locked coins as released.
    if (blockTimeSec === null) {
      return { lockedAmount: null, isLoading: true };
    }

    const { originalVesting } = vestingInfo.schedule;
    const vested = getVestedAmount(vestingInfo.schedule, blockTimeSec);
    const locked = BigNumber.maximum(originalVesting.minus(vested), 0);

    return {
      lockedAmount: locked.shiftedBy(GNOT_TOKEN.decimals * -1),
      isLoading: false,
    };
  }, [active, isLoading, isResolved, vestingInfo, blockTimeSec]);
};
