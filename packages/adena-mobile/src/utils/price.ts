import { BigNumber } from './big-number';

const MIN_DISPLAYABLE_USD = 0.01;
const MIN_DISPLAYABLE_RATE = 0.01;

// USD formatting rules shared with the extension (2 decimals, rounded down, tiny values floored).
export const formatUSD = (value: number): string => {
  const parsed = new BigNumber(value);

  if (!parsed.isFinite()) {
    return '-';
  }

  if (parsed.isGreaterThan(0) && parsed.isLessThan(MIN_DISPLAYABLE_USD)) {
    return `<$${MIN_DISPLAYABLE_USD.toFixed(2)}`;
  }

  return `$${parsed.abs().toFormat(2, BigNumber.ROUND_DOWN)}`;
};

export const formatUSDChange = (value: number): string => {
  const parsed = new BigNumber(value);

  if (!parsed.isFinite()) {
    return '-';
  }

  if (parsed.isZero()) {
    return '$0.00';
  }

  const sign = parsed.isNegative() ? '-' : '+';
  const magnitude = parsed.abs();

  return magnitude.isLessThan(MIN_DISPLAYABLE_USD)
    ? `${sign}<$${MIN_DISPLAYABLE_USD.toFixed(2)}`
    : `${sign}$${magnitude.toFormat(2, BigNumber.ROUND_DOWN)}`;
};

export const formatChangeRate = (rate: number): string => {
  const parsed = new BigNumber(rate);

  if (!parsed.isFinite()) {
    return '-';
  }

  if (parsed.abs().isLessThan(MIN_DISPLAYABLE_RATE)) {
    return '0.00%';
  }

  return `${parsed.isNegative() ? '-' : '+'}${parsed.abs().toFormat(2, BigNumber.ROUND_DOWN)}%`;
};

export const Trend = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  NEUTRAL: 'neutral',
} as const;

export type Trend = (typeof Trend)[keyof typeof Trend];

export const changeTrend = (rate: number | null | undefined): Trend =>
  rate === null || rate === undefined || Math.abs(rate) < MIN_DISPLAYABLE_RATE ? Trend.NEUTRAL : rate > 0 ? Trend.POSITIVE : Trend.NEGATIVE;

// $452.4T / $18.2B / $3.1M / $12.5K for stats rows.
export const formatCompactUSD = (value?: number): string => {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  const units: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const unit = units.find(([threshold]) => Math.abs(value) >= threshold);

  return unit ? `$${new BigNumber(value / unit[0]).toFormat(1, BigNumber.ROUND_DOWN)}${unit[1]}` : formatUSD(value);
};

// Keeps significant digits for sub-dollar prices (e.g. $0.05089).
export const formatTokenPriceUSD = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (value >= 1) {
    return `$${new BigNumber(value).toFormat(2, BigNumber.ROUND_DOWN)}`;
  }

  return `$${new BigNumber(value).precision(4, BigNumber.ROUND_DOWN).toFixed()}`;
};
