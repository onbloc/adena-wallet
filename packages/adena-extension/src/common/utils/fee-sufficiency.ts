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
 * sent coins, then locks the storage deposit. Whichever is the first not to fit
 * is reported, so exactly one of the two fields is flagged.
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

  if (balanceBN.isLessThan(requiredForFee)) {
    return { isInsufficientNetworkFee: true, isInsufficientStorageDeposit: false };
  }

  const netStorageDeposit = BigNumber.max(BigNumber(storageDeposit).minus(unlockDeposit), 0);

  return {
    isInsufficientNetworkFee: false,
    isInsufficientStorageDeposit: balanceBN.isLessThan(requiredForFee.plus(netStorageDeposit)),
  };
}

export type FeeShortfall = 'networkFee' | 'storageDeposit';

const INSUFFICIENT_BALANCE_PATTERN = /insufficient (coins|funds)/i;
const STORAGE_DEPOSIT_PATTERN = /storage deposit|lockStorageDeposit/i;

/**
 * Reads which fee the balance couldn't cover from a failed simulate. Once the
 * simulate fails it returns no storage deposit or gas, so the amount check
 * above has nothing to compare and only the chain's message tells us.
 */
export function getFeeShortfallFromSimulateError(
  simulateErrorMessage: string | null | undefined,
): FeeShortfall | null {
  if (!simulateErrorMessage || !INSUFFICIENT_BALANCE_PATTERN.test(simulateErrorMessage)) {
    return null;
  }

  return STORAGE_DEPOSIT_PATTERN.test(simulateErrorMessage) ? 'storageDeposit' : 'networkFee';
}
