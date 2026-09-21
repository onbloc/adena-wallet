import BigNumber from 'bignumber.js';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { ABCIAccountVesting } from '@common/provider/gno';

// Mirrors tm2/pkg/std/vesting.go: the empty string is the default (linear)
// curve, 'delayed' is a cliff that vests nothing until end_time.
export type VestingScheduleType = 'continuous' | 'delayed';

// Normalised view of ABCIAccountVesting. Amounts stay in the chain's smallest
// unit (ugnot) as BigNumber so large grants never lose precision, and times
// stay unix seconds.
export interface VestingSchedule {
  originalVesting: BigNumber;
  startTime: number;
  endTime: number;
  type: VestingScheduleType;
}

export interface VestingBreakdown {
  schedule: VestingSchedule;
  /** The account's whole ugnot balance. */
  total: BigNumber;
  /** Granted coins that have already vested. */
  vested: BigNumber;
  /** Granted coins that have not vested yet, so cannot be transferred out. */
  locked: BigNumber;
  /** What the holder can actually transfer: total - locked, floored at zero. */
  available: BigNumber;
  /** Vesting progress in the 0..1 range. */
  progress: number;
}

// Coins arrive as an amino coin string: "110294549738ugnot", or comma
// separated when several denoms are held ("1ugnot,5foo"). Only the native
// denom is vested in practice, and it is the only one the wallet renders here.
export function parseUgnotCoins(coins: string | undefined | null): BigNumber {
  if (!coins) {
    return new BigNumber(0);
  }

  const denom = GNOT_TOKEN.denom;
  for (const entry of coins.split(',')) {
    const match = entry.trim().match(new RegExp(`^(\\d+)${denom}$`));
    if (match) {
      return new BigNumber(match[1]);
    }
  }

  return new BigNumber(0);
}

function parseUnixSeconds(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normalise the raw `vesting` field of a BaseAccount.
 *
 * Returns null when the account has no grant — the field is omitted entirely
 * for such accounts, and a zero `original_vesting` is the documented "locks
 * nothing" value, so both collapse to "there is nothing to show".
 */
export function parseVestingSchedule(
  vesting: ABCIAccountVesting | undefined | null,
): VestingSchedule | null {
  if (!vesting) {
    return null;
  }

  const originalVesting = parseUgnotCoins(vesting.original_vesting);
  if (!originalVesting.isFinite() || originalVesting.lte(0)) {
    return null;
  }

  const endTime = parseUnixSeconds(vesting.end_time);
  if (endTime <= 0) {
    return null;
  }

  const type: VestingScheduleType = vesting.type === 'delayed' ? 'delayed' : 'continuous';
  const startTime = parseUnixSeconds(vesting.start_time);

  // A linear schedule with a start at or after its end has no valid curve; the
  // chain rejects one at genesis, so treat it as a cliff rather than dividing
  // by a non-positive span.
  if (type === 'continuous' && startTime >= endTime) {
    return { originalVesting, startTime: 0, endTime, type: 'delayed' };
  }

  return { originalVesting, startTime, endTime, type };
}

/**
 * Coins vested at `nowSec`, following VestingSchedule.VestedCoins in
 * tm2/pkg/std/vesting.go: everything after end_time, nothing before start_time
 * (or before end_time for a cliff), and a floored linear share in between.
 */
export function getVestedAmount(schedule: VestingSchedule, nowSec: number): BigNumber {
  const { originalVesting, startTime, endTime, type } = schedule;

  if (nowSec >= endTime) {
    return originalVesting;
  }
  if (type === 'delayed' || nowSec <= startTime) {
    return new BigNumber(0);
  }

  const elapsed = nowSec - startTime;
  const total = endTime - startTime;

  // The chain truncates the integer division, so match it rather than round.
  return originalVesting.multipliedBy(elapsed).dividedToIntegerBy(total);
}

/**
 * Split an account's balance into what it can and cannot transfer.
 *
 * Locked coins are still debited by gas fees and storage deposits on chain, so
 * the balance can dip below the locked amount; `available` is floored at zero
 * rather than going negative.
 */
export function getVestingBreakdown(
  schedule: VestingSchedule,
  coins: string | undefined | null,
  nowSec: number,
): VestingBreakdown {
  const total = parseUgnotCoins(coins);
  const vested = getVestedAmount(schedule, nowSec);
  const locked = BigNumber.maximum(schedule.originalVesting.minus(vested), 0);
  const available = BigNumber.maximum(total.minus(locked), 0);

  const progress = schedule.originalVesting.lte(0)
    ? 1
    : Math.min(1, Math.max(0, vested.dividedBy(schedule.originalVesting).toNumber()));

  return { schedule, total, vested, locked, available, progress };
}
