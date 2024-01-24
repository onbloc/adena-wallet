import { Amount } from '@types';
import BigNumber from 'bignumber.js';
import { convertTextToAmount } from './string-utils';

const GNOT_DECIMALS = 6 as const;
const GNOT_SYMBOL = 'GNOT' as const;

export function makeGnotAmountByRaw(amountRaw: string): Amount | null {
  const amount = convertTextToAmount(amountRaw);
  if (amount === null) {
    return null;
  }
  const gnotAmount: Amount = {
    value: BigNumber(amount.value)
      .shiftedBy(GNOT_DECIMALS * -1)
      .toFormat(6),
    denom: GNOT_SYMBOL,
  };
  return gnotAmount;
}
