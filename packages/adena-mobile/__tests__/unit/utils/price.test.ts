import {
  changeTrend,
  formatChangeRate,
  formatCompactUSD,
  formatTokenPriceUSD,
  formatUSD,
  formatUSDChange,
  Trend,
} from '../../../src/utils/price';

describe('formatUSD', () => {
  it('formats with two decimals rounded down', () => {
    expect(formatUSD(1234.567)).toBe('$1,234.56');
    expect(formatUSD(0)).toBe('$0.00');
    expect(formatUSD(0.01)).toBe('$0.01');
  });

  it('floors tiny positive values', () => {
    expect(formatUSD(0.0099)).toBe('<$0.01');
    expect(formatUSD(Number.MIN_VALUE)).toBe('<$0.01');
  });

  it('drops the sign of negative values', () => {
    expect(formatUSD(-5.678)).toBe('$5.67');
  });

  it('returns - for non-finite values', () => {
    expect(formatUSD(NaN)).toBe('-');
    expect(formatUSD(Infinity)).toBe('-');
  });

  it('handles huge values', () => {
    expect(formatUSD(1e15)).toBe('$1,000,000,000,000,000.00');
  });
});

describe('formatUSDChange', () => {
  it('signs the change', () => {
    expect(formatUSDChange(12.345)).toBe('+$12.34');
    expect(formatUSDChange(-12.345)).toBe('-$12.34');
  });

  it('formats zero and tiny changes', () => {
    expect(formatUSDChange(0)).toBe('$0.00');
    expect(formatUSDChange(0.001)).toBe('+<$0.01');
    expect(formatUSDChange(-0.001)).toBe('-<$0.01');
  });

  it('returns - for non-finite values', () => {
    expect(formatUSDChange(NaN)).toBe('-');
    expect(formatUSDChange(-Infinity)).toBe('-');
  });
});

describe('formatChangeRate', () => {
  it('formats signed percentages', () => {
    expect(formatChangeRate(3.999)).toBe('+3.99%');
    expect(formatChangeRate(-3.999)).toBe('-3.99%');
    expect(formatChangeRate(0.01)).toBe('+0.01%');
  });

  it('shows tiny rates as 0.00%', () => {
    expect(formatChangeRate(0)).toBe('0.00%');
    expect(formatChangeRate(-0.009)).toBe('0.00%');
  });

  it('returns - for non-finite rates', () => {
    expect(formatChangeRate(NaN)).toBe('-');
  });
});

describe('changeTrend', () => {
  it('maps the rate to a trend', () => {
    expect(changeTrend(1)).toBe(Trend.POSITIVE);
    expect(changeTrend(-1)).toBe(Trend.NEGATIVE);
    expect(changeTrend(0.009)).toBe(Trend.NEUTRAL);
    expect(changeTrend(-0.009)).toBe(Trend.NEUTRAL);
    expect(changeTrend(null)).toBe(Trend.NEUTRAL);
    expect(changeTrend(undefined)).toBe(Trend.NEUTRAL);
  });

  it.todo('NaN rate should be NEUTRAL (currently NEGATIVE)');
});

describe('formatCompactUSD', () => {
  it('uses compact units', () => {
    expect(formatCompactUSD(452.4e12)).toBe('$452.4T');
    expect(formatCompactUSD(18.29e9)).toBe('$18.2B');
    expect(formatCompactUSD(3.19e6)).toBe('$3.1M');
    expect(formatCompactUSD(12_599)).toBe('$12.5K');
    expect(formatCompactUSD(1000)).toBe('$1.0K');
  });

  it('falls back to formatUSD below one thousand', () => {
    expect(formatCompactUSD(999.999)).toBe('$999.99');
    expect(formatCompactUSD(0)).toBe('$0.00');
  });

  it('returns - for missing or non-finite values', () => {
    expect(formatCompactUSD()).toBe('-');
    expect(formatCompactUSD(NaN)).toBe('-');
    expect(formatCompactUSD(Infinity)).toBe('-');
  });

  it.todo('negative values should be formatted consistently (-1500 -> "$-1.5K" but -500 -> "$500.00")');
});

describe('formatTokenPriceUSD', () => {
  it('uses two decimals at or above one dollar', () => {
    expect(formatTokenPriceUSD(1)).toBe('$1.00');
    expect(formatTokenPriceUSD(1234.567)).toBe('$1,234.56');
  });

  it('keeps four significant digits below one dollar', () => {
    expect(formatTokenPriceUSD(0.0508999)).toBe('$0.05089');
    expect(formatTokenPriceUSD(0.99999)).toBe('$0.9999');
    expect(formatTokenPriceUSD(0)).toBe('$0');
  });

  it('returns - for non-finite values', () => {
    expect(formatTokenPriceUSD(NaN)).toBe('-');
    expect(formatTokenPriceUSD(Infinity)).toBe('-');
  });
});
