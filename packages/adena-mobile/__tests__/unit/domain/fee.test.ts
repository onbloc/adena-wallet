import {
  computeFee,
  COSMOS_FEE_POLICY,
  DEFAULT_FEE_SELECTION,
  FeeEstimate,
  FeeRateTarget,
  FeeTier,
  GNO_FEE_POLICY,
} from '../../../src/domain/fee';

const gno = (overrides: Partial<FeeEstimate> = {}): FeeEstimate => ({ gasUsed: '100000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY, ...overrides });
const cosmos = (overrides: Partial<FeeEstimate> = {}): FeeEstimate => ({ gasUsed: '100000', gasPrice: '0.025', denom: 'uphoton', policy: COSMOS_FEE_POLICY, ...overrides });

describe('policies', () => {
  it('match the extension', () => {
    expect(GNO_FEE_POLICY).toEqual({ gasMargin: 1, tierRates: { SLOW: 1, AVERAGE: 1.1, FAST: 1.2 }, rateTarget: FeeRateTarget.GAS });
    expect(COSMOS_FEE_POLICY).toEqual({ gasMargin: 1.3, tierRates: { SLOW: 1, AVERAGE: 1.2, FAST: 1.5 }, rateTarget: FeeRateTarget.PRICE });
    expect(DEFAULT_FEE_SELECTION).toEqual({ tier: FeeTier.AVERAGE, adjustment: 1 });
  });
});

describe('computeFee (gno, scales gas)', () => {
  it.each([
    [FeeTier.SLOW, '100000', '100ugnot'],
    [FeeTier.AVERAGE, '110000', '110ugnot'],
    [FeeTier.FAST, '120000', '120ugnot'],
    [FeeTier.CUSTOM, '100000', '100ugnot'],
  ])('%s tier', (tier, gasWanted, gasFee) => {
    expect(computeFee(gno(), { tier, adjustment: 1 })).toEqual({ gasWanted, gasFee, tooLow: false });
  });

  it('applies the adjustment and rounds gas down, fee up', () => {
    expect(computeFee(gno({ gasUsed: '3' }), { tier: FeeTier.CUSTOM, adjustment: 1.5 })).toEqual({ gasWanted: '4', gasFee: '1ugnot', tooLow: false });
  });

  it('flags budgets below the simulated usage', () => {
    expect(computeFee(gno(), { tier: FeeTier.CUSTOM, adjustment: 0.5 }).tooLow).toBe(true);
  });

  it.each([0, -1, NaN, Infinity])('ignores invalid adjustment %p', (adjustment) => {
    expect(computeFee(gno(), { tier: FeeTier.SLOW, adjustment }).gasWanted).toBe('100000');
  });

  it('handles zero gas and huge values', () => {
    expect(computeFee(gno({ gasUsed: '0' }), DEFAULT_FEE_SELECTION)).toEqual({ gasWanted: '0', gasFee: '0ugnot', tooLow: false });
    expect(computeFee(gno({ gasUsed: '1000000000000000000000', gasPrice: '1' }), { tier: FeeTier.SLOW, adjustment: 1 }).gasFee).toBe('1000000000000000000000ugnot');
  });
});

describe('computeFee (cosmos, scales price)', () => {
  it('applies the gas margin and tier price rate', () => {
    expect(computeFee(cosmos(), { tier: FeeTier.SLOW, adjustment: 1 })).toEqual({ gasWanted: '130000', gasFee: '3250uphoton', tooLow: false });
    expect(computeFee(cosmos(), { tier: FeeTier.FAST, adjustment: 1 })).toEqual({ gasWanted: '130000', gasFee: '4875uphoton', tooLow: false });
  });

  it('rounds the gas budget up', () => {
    expect(computeFee(cosmos({ gasUsed: '1' }), { tier: FeeTier.CUSTOM, adjustment: 2 })).toEqual({ gasWanted: '2', gasFee: '1uphoton', tooLow: false });
  });
});
