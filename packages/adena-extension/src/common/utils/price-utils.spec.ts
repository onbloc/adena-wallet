import {
  aggregateTokenValues,
  formatChangeRate,
  formatUSD,
  formatUSDChange,
  getChangeTone,
  getTokenPriceKey,
  makeTokenValue,
} from './price-utils';

describe('formatUSD', () => {
  it('fixes two decimals and truncates beyond them', () => {
    expect(formatUSD(1234.5)).toBe('$1,234.50');
    expect(formatUSD(2120252.239)).toBe('$2,120,252.23');
    expect(formatUSD(0)).toBe('$0.00');
  });

  it('collapses any non-zero amount below a cent into "<$0.01"', () => {
    expect(formatUSD(0.009)).toBe('<$0.01');
    expect(formatUSD(0.01)).toBe('$0.01');
    expect(formatUSD(-0.009)).toBe('>-$0.01');
  });

  it('renders a placeholder for non-finite input', () => {
    expect(formatUSD(NaN)).toBe('-');
  });
});

describe('formatUSDChange', () => {
  it('always carries a sign', () => {
    expect(formatUSDChange(125.02)).toBe('+$125.02');
    expect(formatUSDChange(-3)).toBe('-$3.00');
  });

  it('keeps the sign on sub-cent moves and drops it when flat', () => {
    expect(formatUSDChange(0.004)).toBe('+<$0.01');
    expect(formatUSDChange(-0.004)).toBe('-<$0.01');
    expect(formatUSDChange(0)).toBe('$0.00');
  });
});

describe('formatChangeRate', () => {
  it('fixes two decimals and truncates beyond them', () => {
    expect(formatChangeRate(3.2941)).toBe('+3.29%');
    expect(formatChangeRate(-2.049)).toBe('-2.04%');
    expect(formatChangeRate(15.25)).toBe('+15.25%');
  });

  it('writes sub-0.01% moves as a signed zero and a flat rate as an unsigned one', () => {
    expect(formatChangeRate(0.004)).toBe('+0.00%');
    expect(formatChangeRate(-0.004)).toBe('-0.00%');
    expect(formatChangeRate(0)).toBe('0.00%');
  });
});

describe('getChangeTone', () => {
  it('treats only an exactly flat rate as neutral', () => {
    expect(getChangeTone(0.004)).toBe('positive');
    expect(getChangeTone(-0.004)).toBe('negative');
    expect(getChangeTone(0)).toBe('neutral');
    expect(getChangeTone(NaN)).toBe('neutral');
  });
});

describe('makeTokenValue', () => {
  const price = { tokenId: 'ugnot', networkId: 'gnoland-1', usd: 2, change24h: 5 };

  it('multiplies a formatted balance by the quote', () => {
    expect(makeTokenValue('1,000.5', price)).toEqual({ usdValue: 2001, change24h: 5 });
  });

  it('returns null without a quote or with an unusable balance', () => {
    expect(makeTokenValue('1,000.5', undefined)).toBeNull();
    expect(makeTokenValue('-', price)).toBeNull();
    expect(makeTokenValue('', price)).toBeNull();
  });
});

describe('aggregateTokenValues', () => {
  it('sums values and derives the delta from each token own change rate', () => {
    // 110 came from 100 (+10%), 200 came from 250 (-20%).
    const result = aggregateTokenValues([
      { usdValue: 110, change24h: 10 },
      { usdValue: 200, change24h: -20 },
    ]);

    expect(result.totalUSDValue).toBe(310);
    expect(result.changeUSDValue).toBeCloseTo(-40, 10);
    expect(result.changeRate).toBeCloseTo(-11.4285714286, 8);
  });

  it('reports a flat portfolio when nothing moved', () => {
    expect(aggregateTokenValues([{ usdValue: 50, change24h: 0 }])).toEqual({
      totalUSDValue: 50,
      changeUSDValue: 0,
      changeRate: 0,
    });
  });

  it('reports an unknown delta for an empty portfolio', () => {
    expect(aggregateTokenValues([])).toEqual({
      totalUSDValue: 0,
      changeUSDValue: null,
      changeRate: null,
    });
  });

  it('counts an unquoted-change token toward the total but not the delta', () => {
    expect(
      aggregateTokenValues([
        { usdValue: 100, change24h: null },
        { usdValue: 110, change24h: 10 },
      ]),
    ).toEqual({
      totalUSDValue: 210,
      changeUSDValue: 10,
      changeRate: 5,
    });
  });

  it('reports no delta when no token reports a change rate', () => {
    expect(aggregateTokenValues([{ usdValue: 100, change24h: null }])).toEqual({
      totalUSDValue: 100,
      changeUSDValue: null,
      changeRate: null,
    });
  });
});

describe('getTokenPriceKey', () => {
  it('scopes a quote to its network so same-symbol tokens never collide', () => {
    expect(getTokenPriceKey('uatone', 'atomone-1')).not.toBe(
      getTokenPriceKey('uatone', 'atomone-testnet-1'),
    );
  });
});
