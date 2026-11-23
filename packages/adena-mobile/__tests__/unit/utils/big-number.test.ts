import { BigNumber } from '../../../src/utils/big-number';

describe('BigNumber', () => {
  it('turns invalid input into NaN instead of throwing', () => {
    expect(new BigNumber('not a number').isNaN()).toBe(true);
    expect(new BigNumber('').isFinite()).toBe(false);
  });

  it('keeps arbitrary precision', () => {
    expect(new BigNumber('0.1').plus('0.2').toFixed()).toBe('0.3');
  });
});
