import { GNOT_TOKEN } from '@common/constants/token.constant';
import BigNumber from 'bignumber.js';

import { parseTokenAmount } from './amount-utils';

interface MessageWithValue {
  value?: {
    amount?: string;
    send?: string;
    [key: string]: unknown;
  };
}

/**
 * Sums the GNOT (in ugnot) that the messages move out of the signer's balance:
 * `amount` on a bank send, `send` on a `vm.m_call` / `vm.m_run`.
 * Coin strings may list several denoms (`"1ugnot,2foo"`); only GNOT is counted.
 */
export function sumSpentGnotAmount(
  msgs: MessageWithValue[] | undefined,
  denom = GNOT_TOKEN.denom,
): BigNumber {
  if (!msgs) {
    return BigNumber(0);
  }

  return msgs.reduce((acc, msg) => {
    const coins = msg.value?.amount || msg.value?.send;
    if (!coins || typeof coins !== 'string') {
      return acc;
    }

    return coins
      .split(',')
      .reduce((sum, coin) => sum.plus(parseTokenAmount(coin.trim(), denom)), acc);
  }, BigNumber(0));
}

export interface FeeSufficiencyParams {
  /** GNOT balance, in ugnot. */
  balance: BigNumber.Value;
  /** GNOT the messages send out, in ugnot. */
  spentAmount: BigNumber.Value;
  /** Network fee, in ugnot. */
  networkFee: BigNumber.Value;
  /** Storage deposit locked by the transaction, in ugnot. */
  storageDeposit: BigNumber.Value;
  /** Storage deposit released by the transaction, in ugnot. */
  unlockDeposit: BigNumber.Value;
}

export interface FeeSufficiency {
  isInsufficientNetworkFee: boolean;
  isInsufficientStorageDeposit: boolean;
}

/**
 * Checks whether the balance covers everything the transaction takes from it.
 *
 * The chain charges the network fee before running the messages, then moves the
 * sent coins, then locks the storage deposit. The network fee is short when the
 * balance can't cover the sent coins plus the fee; the storage deposit is short
 * when there is a deposit and the balance can't cover it on top of those. Both
 * are flagged when neither fits.
 */
export function checkFeeSufficiency({
  balance,
  spentAmount,
  networkFee,
  storageDeposit,
  unlockDeposit,
}: FeeSufficiencyParams): FeeSufficiency {
  const balanceBN = BigNumber(balance);
  const requiredForFee = BigNumber(spentAmount).plus(networkFee);
  const netStorageDeposit = BigNumber.max(BigNumber(storageDeposit).minus(unlockDeposit), 0);

  return {
    isInsufficientNetworkFee: balanceBN.isLessThan(requiredForFee),
    isInsufficientStorageDeposit:
      netStorageDeposit.isGreaterThan(0) &&
      balanceBN.isLessThan(requiredForFee.plus(netStorageDeposit)),
  };
}

export type FeeShortfall = 'networkFee' | 'storageDeposit';

// tm2 auth ante handler, when the balance can't pay the fee.
const NETWORK_FEE_SHORTFALL_PATTERN = /insufficient funds to pay for fees/i;
// gno.land vm keeper, when the balance can't lock a realm's storage deposit.
const STORAGE_DEPOSIT_SHORTFALL_PATTERN =
  /(lockStorageDeposit failed|unable to transfer deposit).*insufficient (coins|funds)/i;

/**
 * Reads which fee the balance couldn't cover from a failed simulate. Once the
 * simulate fails it returns no storage deposit or gas, so the amount check
 * above has nothing to compare and only the chain's message tells us.
 *
 * Only errors that name the fee or the storage deposit are classified; any
 * other `insufficient coins` error (e.g. sending a token the account lacks)
 * returns null so the raw simulate error is still shown.
 */
export function getFeeShortfallFromSimulateError(
  simulateErrorMessage: string | null | undefined,
): FeeShortfall | null {
  if (!simulateErrorMessage) {
    return null;
  }

  if (STORAGE_DEPOSIT_SHORTFALL_PATTERN.test(simulateErrorMessage)) {
    return 'storageDeposit';
  }

  if (NETWORK_FEE_SHORTFALL_PATTERN.test(simulateErrorMessage)) {
    return 'networkFee';
  }

  return null;
}
