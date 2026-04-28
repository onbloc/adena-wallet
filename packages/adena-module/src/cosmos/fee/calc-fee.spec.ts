import { calcFee, FEE_PRESET_MULTIPLIERS } from './calc-fee';

describe('calcFee', () => {
  it('applies 1.3x safety margin to gas_limit and ceils the fee amount', () => {
    const fee = calcFee({
      gasUsed: 100_000,
      gasMultiplier: 1.0,
      minBaseGasPrice: '0.025',
      feeDenom: 'uphoton',
    });
    // gas_limit = ceil(100_000 * 1.3) = 130_000
    // amount = ceil(130_000 * 0.025 * 1.0) = 3_250
    expect(fee.gas).toBe('130000');
    expect(fee.amount).toEqual([{ denom: 'uphoton', amount: '3250' }]);
  });

  it('applies preset multipliers (slow/average/fast) to the fee amount', () => {
    const base = {
      gasUsed: 200_000,
      minBaseGasPrice: '0.01',
      feeDenom: 'uphoton',
    };
    const slow = calcFee({ ...base, gasMultiplier: FEE_PRESET_MULTIPLIERS.SLOW });
    const average = calcFee({
      ...base,
      gasMultiplier: FEE_PRESET_MULTIPLIERS.AVERAGE,
    });
    const fast = calcFee({ ...base, gasMultiplier: FEE_PRESET_MULTIPLIERS.FAST });

    // gas_limit = ceil(200_000 * 1.3) = 260_000
    expect(slow.gas).toBe('260000');
    expect(average.gas).toBe('260000');
    expect(fast.gas).toBe('260000');
    // amounts = ceil(260_000 * 0.01 * {1.0, 1.2, 1.5})
    expect(slow.amount[0].amount).toBe('2600');
    expect(average.amount[0].amount).toBe('3120');
    expect(fast.amount[0].amount).toBe('3900');
  });

  it('handles 18-decimal Dec strings without float drift', () => {
    const fee = calcFee({
      gasUsed: 100_000,
      gasMultiplier: 1.0,
      minBaseGasPrice: '0.025000000000000000',
      feeDenom: 'uphoton',
    });
    expect(fee.amount[0].amount).toBe('3250');
  });

  it('rounds the fee amount up when the exact product has a fractional part', () => {
    const fee = calcFee({
      gasUsed: 1,
      gasMultiplier: 1.0,
      minBaseGasPrice: '0.5',
      feeDenom: 'uphoton',
    });
    // gas_limit = ceil(1 * 1.3) = 2 → amount = ceil(2 * 0.5) = 1
    // switch to a value that forces rounding:
    expect(fee.amount[0].amount).toBe('1');

    const fee2 = calcFee({
      gasUsed: 1,
      gasMultiplier: 1.0,
      minBaseGasPrice: '0.3',
      feeDenom: 'uphoton',
    });
    // gas_limit = 2, amount = ceil(2 * 0.3) = ceil(0.6) = 1
    expect(fee2.amount[0].amount).toBe('1');
  });

  it('throws on invalid input', () => {
    expect(() =>
      calcFee({
        gasUsed: 0,
        gasMultiplier: 1.0,
        minBaseGasPrice: '0.025',
        feeDenom: 'uphoton',
      }),
    ).toThrow(/gasUsed/);
    expect(() =>
      calcFee({
        gasUsed: 100,
        gasMultiplier: 0,
        minBaseGasPrice: '0.025',
        feeDenom: 'uphoton',
      }),
    ).toThrow(/gasMultiplier/);
    expect(() =>
      calcFee({
        gasUsed: 100,
        gasMultiplier: 1.0,
        minBaseGasPrice: '0.025',
        feeDenom: '',
      }),
    ).toThrow(/feeDenom/);
    expect(() =>
      calcFee({
        gasUsed: 100,
        gasMultiplier: 1.0,
        minBaseGasPrice: 'not-a-number',
        feeDenom: 'uphoton',
      }),
    ).toThrow(/decimal/);
  });
});
