import {
  effectiveSlippage,
  encodeRoutes,
  estimatePriceImpact,
  exactOutMinimum,
  formatFeeTier,
  isValidDeadline,
  isValidSlippage,
  maxAmountIn,
  minAmountOut,
  routerFeeOf,
  slippageToBps,
  swapDeadline,
  swapLimits,
  SwapRoute,
  validateRoutes,
} from '../../../src/domain/swap';
import { isTokenPath } from '../../../src/resources';

const WUGNOT = 'gno.land/r/gnoland/wugnot.wugnot';
const GNS = 'gno.land/r/gnoswap/gns.GNS';
const GNOMIC = 'gno.land/r/nym-thegnomic001/gnomic.GNOMIC';
const TIERS = [100, 500, 3000, 10000];

// The mainnet split the route API returned for 1 wugnot -> GNS (fixtures/gnoswap/route-mainnet.json).
const SPLIT: SwapRoute[] = [
  { percent: 50, hops: [{ tokenIn: WUGNOT, tokenOut: GNOMIC, fee: 3000, midPrice: '6.03' }, { tokenIn: GNOMIC, tokenOut: GNS, fee: 10000, midPrice: '0.7346' }] },
  { percent: 50, hops: [{ tokenIn: WUGNOT, tokenOut: GNS, fee: 3000, midPrice: '4.0997' }] },
];

describe('swap math', () => {
  it('converts slippage percent to basis points within the allowed range', () => {
    expect(slippageToBps(0.5)).toBe(50);
    expect(slippageToBps(0.01)).toBe(1);
    expect(slippageToBps(12.34)).toBe(1234);
    expect(() => slippageToBps(0)).toThrow();
    expect(() => slippageToBps(51)).toThrow();
    expect(isValidSlippage(Number.NaN)).toBe(false);
    expect(effectiveSlippage({ slippage: null, deadlineMinutes: 10 })).toBe(0.5);
    expect(effectiveSlippage({ slippage: 2, deadlineMinutes: 10 })).toBe(2);
  });

  it('floors the minimum output with bigint math and never returns zero', () => {
    expect(minAmountOut('4151365', 50)).toBe('4130608');
    expect(minAmountOut('59', 50)).toBe('58');
    expect(minAmountOut('1', 9_999)).toBe('1');
    // Exceeds Number precision but stays exact.
    expect(minAmountOut('9223372036854775807', 100)).toBe('9131138316486228048');
    expect(() => minAmountOut('0', 50)).toThrow();
    expect(() => minAmountOut('1.5', 50)).toThrow();
    expect(() => minAmountOut('9223372036854775808', 50)).toThrow();
    expect(() => minAmountOut('100', 10_000)).toThrow();
  });

  it('rounds amountInMax up and caps it at int64', () => {
    expect(maxAmountIn('962929', 50)).toBe('967744');
    expect(maxAmountIn('1000', 50)).toBe('1005');
    expect(maxAmountIn('1', 1)).toBe('2');
    expect(maxAmountIn('1000000', 0)).toBe('1000000');
    expect(maxAmountIn('9223372036854775807', 100)).toBe('9223372036854775807');
    expect(() => maxAmountIn('0', 50)).toThrow();
  });

  it('derives the exact-out guaranteed output and both limits per side', () => {
    expect(exactOutMinimum('4000000', SPLIT)).toBe('3999997');
    expect(swapLimits({ exactType: 'EXACT_OUT', requestedAmount: '4000000', amountIn: '962929', amountOut: '4000000', routes: SPLIT }, 50)).toEqual({ maxAmountIn: '967744', minAmountOut: '3999997' });
    // The minimum is derived from the request, not a dry-run output already rounded down.
    expect(swapLimits({ exactType: 'EXACT_OUT', requestedAmount: '4000000', amountIn: '962929', amountOut: '3999999', routes: SPLIT }, 50).minAmountOut).toBe('3999997');
    expect(swapLimits({ exactType: 'EXACT_IN', requestedAmount: '1000000', amountIn: '1000000', amountOut: '4151365', routes: SPLIT }, 50)).toEqual({ maxAmountIn: '1000000', minAmountOut: '4130608' });
  });

  it('builds the deadline in unix seconds from minutes', () => {
    expect(swapDeadline(Date.parse('2026-11-24T00:00:00.900Z'), 10)).toBe(Date.parse('2026-11-24T00:10:00Z') / 1000);
    expect(isValidDeadline(0)).toBe(false);
    expect(isValidDeadline(1.5)).toBe(false);
    expect(() => swapDeadline(0, 181)).toThrow();
  });

  it('derives the router fee from a net output', () => {
    // 15 bps: net 4,151,365 of gross 4,157,601.
    expect(routerFeeOf('4151365', 15)).toBe('6236');
    expect(routerFeeOf('100', 0)).toBe('0');
  });

  it('encodes routes in swap direction with *POOL* and comma separators', () => {
    expect(encodeRoutes(SPLIT)).toEqual({
      routeArr: `${WUGNOT}:${GNOMIC}:3000*POOL*${GNOMIC}:${GNS}:10000,${WUGNOT}:${GNS}:3000`,
      quoteArr: '50,50',
    });
    expect(formatFeeTier(3000)).toBe('0.3%');
    expect(formatFeeTier(100)).toBe('0.01%');
  });

  it('rejects routes the router would refuse', () => {
    const valid = (): void => validateRoutes(SPLIT, WUGNOT, GNS, TIERS, isTokenPath);
    const check = (routes: SwapRoute[], input = WUGNOT, output = GNS) => (): void => validateRoutes(routes, input, output, TIERS, isTokenPath);
    const direct = SPLIT[1];

    expect(valid).not.toThrow();
    expect(check([{ ...direct, percent: 90 }])).toThrow('sum to 90');
    expect(check([{ ...direct, hops: [{ ...direct.hops[0], fee: 2500 }] }])).toThrow('fee tier');
    expect(check([{ ...direct, hops: [{ ...direct.hops[0], tokenIn: GNOMIC }] }])).toThrow('continuous');
    expect(check([direct], WUGNOT, GNOMIC)).toThrow('output token');
    expect(check([direct], GNS, GNS)).toThrow('same');
    expect(check([])).toThrow('route count');
    expect(check(Array.from({ length: 8 }, () => ({ ...direct, percent: 12 })))).toThrow('route count');
    expect(check([{ percent: 100, hops: [direct.hops[0], { tokenIn: GNS, tokenOut: WUGNOT, fee: 500 }, { tokenIn: WUGNOT, tokenOut: GNOMIC, fee: 500 }, { tokenIn: GNOMIC, tokenOut: GNS, fee: 500 }] }])).toThrow('hop count');
    expect(check([{ ...direct, hops: [{ ...direct.hops[0], tokenOut: 'ugnot' }] }], WUGNOT, 'ugnot')).toThrow();
  });

  it('estimates price impact against pool mid prices before the router fee', () => {
    const impact = estimatePriceImpact([{ percent: 100, hops: [{ tokenIn: WUGNOT, tokenOut: GNS, fee: 3000, midPrice: '4.1' }] }], '1000000', '4081485', 15);

    // Gross 4,087,616 vs. mid 4,100,000: about -0.30% (mostly the 0.3% pool fee).
    expect(impact).toBeCloseTo(-0.302, 2);
    expect(estimatePriceImpact([{ percent: 100, hops: [{ tokenIn: WUGNOT, tokenOut: GNS, fee: 3000 }] }], '1', '1', 0)).toBeNull();
    // EXACT_OUT: the mid price needs 4,006,010 / 4.1 = 977,076 for the 4 GNS; paying 980,000 is about -0.30%.
    expect(estimatePriceImpact([{ percent: 100, hops: [{ tokenIn: WUGNOT, tokenOut: GNS, fee: 3000, midPrice: '4.1' }] }], '980000', '4000000', 15, 'EXACT_OUT')).toBeCloseTo(-0.298, 2);
  });
});
