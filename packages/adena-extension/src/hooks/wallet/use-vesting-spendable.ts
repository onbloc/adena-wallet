import BigNumber from 'bignumber.js';
import { useMemo } from 'react';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { getVestingBreakdown } from '@common/utils/vesting-utils';
import { useChainBlockTime } from '@hooks/wallet/use-chain-block-time';
import { useVestingInfo } from '@hooks/wallet/use-vesting-info';

// Matches the grant poll in `useVestingInfo`: a linear schedule releases coins
// on every block, so the cap has to keep moving while the screen is open.
const VESTING_BLOCK_TIME_INTERVAL = 5_000;

export interface VestingSpendable {
  /**
   * GNOT the account may transfer right now, in display units, or null when
   * nothing caps its balance — no grant, or the caller disabled the lookup.
   */
  spendableAmount: BigNumber | null;
  /**
   * True until the cap is known. Callers must not read that as "no cap": a
   * grant that has not loaded yet would otherwise let MAX offer locked coins.
   */
  isLoading: boolean;
}

/**
 * How much of `address`'s GNOT is actually transferable under its vesting
 * grant.
 *
 * Only the send amount is capped. Gas fees and storage deposits are taken from
 * the whole balance on chain — locked coins included — so they are not part of
 * this figure; the caller subtracts them from the balance separately and keeps
 * whichever limit binds first.
 */
export const useVestingSpendable = (
  address: string | null | undefined,
  enabled = true,
): VestingSpendable => {
  const active = enabled && !!address;
  const { vestingInfo, isLoading } = useVestingInfo(active ? address : null);
  const blockTimeSec = useChainBlockTime(active && !!vestingInfo, VESTING_BLOCK_TIME_INTERVAL);

  return useMemo(() => {
    if (!active) {
      return { spendableAmount: null, isLoading: false };
    }

    if (isLoading) {
      return { spendableAmount: null, isLoading: true };
    }

    if (!vestingInfo) {
      return { spendableAmount: null, isLoading: false };
    }

    // Vesting is enforced at `ctx.BlockTime()`, so wait for the chain's clock
    // rather than falling back to the device's, which may run ahead of it and
    // report locked coins as released.
    if (blockTimeSec === null) {
      return { spendableAmount: null, isLoading: true };
    }

    const { available } = getVestingBreakdown(
      vestingInfo.schedule,
      vestingInfo.coins,
      blockTimeSec,
    );

    return {
      spendableAmount: available.shiftedBy(GNOT_TOKEN.decimals * -1),
      isLoading: false,
    };
  }, [active, isLoading, vestingInfo, blockTimeSec]);
};
