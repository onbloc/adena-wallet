import BigNumber from 'bignumber.js';

export interface TransferLimitParams {
  /** The account's balance, in display units. */
  balance: BigNumber;
  /** What a session's spend limit still allows, or null outside a session. */
  sessionSpendable: BigNumber | null;
  /** What a vesting grant still locks, or null when nothing is locked. */
  vestingLocked: BigNumber | null;
  /** The fee reserved for the transfer, in display units. */
  feeAmount: BigNumber;
}

/**
 * The largest amount a transfer may carry, in display units.
 *
 * Three limits apply, and the smallest wins:
 *
 * - the balance itself;
 * - a session's remaining spend allowance, which the chain measures as
 *   fee + amount;
 * - a vesting grant's lock.
 *
 * The fee is taken off *after* the lock, not before it. `auth`'s ante handler
 * debits the fee without consulting `LockedCoins`, so a fee may be paid out of
 * locked coins — but paying it releases nothing, and `bank.SubtractCoins` then
 * checks the balance that is left against the unchanged lock. A transfer may
 * therefore use at most `balance - locked - fee`, and subtracting the fee first
 * would overstate it by exactly the fee.
 *
 * Floored at zero: a balance that no longer covers its own lock is not a
 * negative allowance.
 */
export function getTransferLimitAmount({
  balance,
  sessionSpendable,
  vestingLocked,
  feeAmount,
}: TransferLimitParams): BigNumber {
  let limit = balance;

  if (sessionSpendable !== null && sessionSpendable.isLessThan(limit)) {
    limit = sessionSpendable;
  }

  if (vestingLocked !== null) {
    const unlocked = balance.minus(vestingLocked);
    if (unlocked.isLessThan(limit)) {
      limit = unlocked;
    }
  }

  const transferable = limit.minus(feeAmount);

  return transferable.isGreaterThan(0) ? transferable : BigNumber(0);
}
