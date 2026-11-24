import { BigNumber } from './big-number';

// clone() starts from library defaults, so STRICT is set again here.
const BN = BigNumber.clone({ STRICT: false, EXPONENTIAL_AT: 1e9, ROUNDING_MODE: BigNumber.ROUND_DOWN });

export const toBaseUnit = (displayAmount: string, decimals: number): string => {
  const value = new BN(displayAmount);

  if (!value.isFinite() || value.isNegative()) {
    throw new Error(`invalid amount: ${displayAmount}`);
  }

  return value.shiftedBy(decimals).integerValue(BigNumber.ROUND_DOWN).toFixed(0);
};

export const toDisplayAmount = (baseAmount: string, decimals: number): string =>
  new BN(baseAmount || '0').shiftedBy(-decimals).toFixed();

// Keeps full precision so a non-zero balance never renders as zero.
export const formatTokenAmount = (baseAmount: string, decimals: number, maxFractionDigits = decimals): string => {
  const value = new BN(baseAmount || '0').shiftedBy(-decimals);

  if (value.isZero()) {
    return '0';
  }

  const rounded = value.decimalPlaces(maxFractionDigits, BigNumber.ROUND_DOWN);
  const display = rounded.isZero() ? value : rounded;

  return display.toFormat({ decimalSeparator: '.', groupSeparator: ',', groupSize: 3 });
};

export const compareAmount = (a: string, b: string): number => new BN(a).comparedTo(new BN(b)) ?? 0;

export const addAmount = (a: string, b: string): string => new BN(a).plus(b).toFixed(0);

export const subtractAmount = (a: string, b: string): string => {
  const result = new BN(a).minus(b);

  return result.isNegative() ? '0' : result.toFixed(0);
};

export const isPositiveAmount = (displayAmount: string): boolean => {
  const value = new BN(displayAmount);

  return value.isFinite() && value.isGreaterThan(0);
};

export const parseCoin = (coin: string): { amount: string; denom: string } | null => {
  const match = /^(\d+)([a-z][a-z0-9/:._-]{2,})$/.exec(coin.trim());

  return match ? { amount: match[1], denom: match[2] } : null;
};
