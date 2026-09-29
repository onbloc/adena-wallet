import BigNumber from 'bignumber.js';

import { TokenPrice, TokenValue } from '@types';

/** Smallest USD amount / percentage writable under the 2-decimal policy. */
const MIN_DISPLAYABLE_USD = 0.01;
const MIN_DISPLAYABLE_RATE = 0.01;

export type ChangeTone = 'positive' | 'negative' | 'neutral';

// Network-scoped: the same ticker can exist on more than one chain (ATONE on
// mainnet vs testnet) and must not share a quote.
export function getTokenPriceKey(tokenId: string, networkId: string): string {
  return `${tokenId}:${networkId}`;
}

/**
 * Convert a rendered (comma-formatted) balance to its USD value. Null when
 * unquoted or unparseable, so callers can fall back to the price-less layout.
 */
export function makeTokenValue(
  balanceValue: string,
  price: TokenPrice | undefined,
): TokenValue | null {
  if (!price) {
    return null;
  }

  const parsed = BigNumber(balanceValue.replace(/,/g, ''));
  if (!parsed.isFinite()) {
    return null;
  }

  return {
    usdValue: parsed.multipliedBy(price.usd).toNumber(),
    change24h: price.change24h,
  };
}

/** Two decimals, truncated (never rounded up). Sub-cent amounts read "<$0.01". */
export function formatUSD(value: number): string {
  const parsed = BigNumber(value);
  if (!parsed.isFinite()) {
    return '-';
  }

  if (parsed.isGreaterThan(0) && parsed.isLessThan(MIN_DISPLAYABLE_USD)) {
    return `<$${MIN_DISPLAYABLE_USD.toFixed(2)}`;
  }

  if (parsed.isLessThan(0) && parsed.isGreaterThan(-MIN_DISPLAYABLE_USD)) {
    return `>-$${MIN_DISPLAYABLE_USD.toFixed(2)}`;
  }

  return `$${parsed.abs().toFormat(2, BigNumber.ROUND_DOWN)}`;
}

/** Signed 24h delta: `+$125.02`, `-$3.00`, `+<$0.01`. */
export function formatUSDChange(value: number): string {
  const parsed = BigNumber(value);
  if (!parsed.isFinite()) {
    return '-';
  }

  if (parsed.isZero()) {
    return `$${BigNumber(0).toFormat(2)}`;
  }

  const sign = parsed.isNegative() ? '-' : '+';
  const magnitude = parsed.abs();

  if (magnitude.isLessThan(MIN_DISPLAYABLE_USD)) {
    return `${sign}<$${MIN_DISPLAYABLE_USD.toFixed(2)}`;
  }

  return `${sign}$${magnitude.toFormat(2, BigNumber.ROUND_DOWN)}`;
}

/**
 * Two decimals, truncated. A move too small to render keeps its sign
 * ("+0.00%"); a genuinely flat rate drops it ("0.00%") and reads grey.
 */
export function formatChangeRate(rate: number): string {
  const parsed = BigNumber(rate);
  if (!parsed.isFinite()) {
    return '-';
  }

  if (parsed.isZero()) {
    return `${BigNumber(0).toFormat(2)}%`;
  }

  const sign = parsed.isNegative() ? '-' : '+';
  const magnitude = parsed.abs();

  if (magnitude.isLessThan(MIN_DISPLAYABLE_RATE)) {
    return `${sign}${BigNumber(0).toFormat(2)}%`;
  }

  return `${sign}${magnitude.toFormat(2, BigNumber.ROUND_DOWN)}%`;
}

export function getChangeTone(rate: number): ChangeTone {
  const parsed = BigNumber(rate);
  if (!parsed.isFinite() || parsed.isZero()) {
    return 'neutral';
  }

  return parsed.isNegative() ? 'negative' : 'positive';
}

export interface PortfolioValue {
  totalUSDValue: number;
  /** Null when no quoted token reports a 24h change: unknown, not flat. */
  changeUSDValue: number | null;
  changeRate: number | null;
}

/**
 * The 24h delta is derived per token from its own change rate:
 * `value - value / (1 + rate/100)`. A rate of exactly -100% would divide by
 * zero, so such a token contributes its full current value.
 *
 * A token whose change rate is unknown still counts toward the total but not
 * toward the delta — its value is carried over unchanged, as if flat, which is
 * the only assumption that leaves the rest of the portfolio's delta intact.
 */
export function aggregateTokenValues(values: TokenValue[]): PortfolioValue {
  let total = BigNumber(0);
  let previousTotal = BigNumber(0);
  let hasKnownChange = false;

  for (const { usdValue, change24h } of values) {
    const current = BigNumber(usdValue);
    if (!current.isFinite()) {
      continue;
    }

    total = total.plus(current);

    if (change24h === null) {
      previousTotal = previousTotal.plus(current);
      continue;
    }

    hasKnownChange = true;

    const factor = BigNumber(change24h).dividedBy(100).plus(1);
    previousTotal = previousTotal.plus(
      factor.isZero() || !factor.isFinite() ? current : current.dividedBy(factor),
    );
  }

  if (!hasKnownChange) {
    return {
      totalUSDValue: total.toNumber(),
      changeUSDValue: null,
      changeRate: null,
    };
  }

  const change = total.minus(previousTotal);

  return {
    totalUSDValue: total.toNumber(),
    changeUSDValue: change.toNumber(),
    changeRate: previousTotal.isZero()
      ? 0
      : change.dividedBy(previousTotal).multipliedBy(100).toNumber(),
  };
}
