import { fromBaseUnits, normalizeDecimal, toBaseUnits } from '../amount';

describe('normalizeDecimal', () => {
  it.each([
    ['0.5', '0.5'],
    ['0.50', '0.5'],
    ['007', '7'],
    ['10.0', '10'],
    ['0', '0'],
    [' 1.25 ', '1.25'],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeDecimal(input)).toBe(expected);
  });

  it.each(['', '-1', '1e3', '.5', '5.', '1,5', 'abc', '1.2.3', '0x10'])(
    'rejects %p',
    (input) => {
      expect(normalizeDecimal(input)).toBeNull();
    }
  );

  it('rejects oversized input', () => {
    expect(normalizeDecimal('9'.repeat(41))).toBeNull();
    expect(normalizeDecimal('9'.repeat(40))).toBe('9'.repeat(40));
  });
});

describe('toBaseUnits / fromBaseUnits', () => {
  it('converts exactly without float error', () => {
    expect(toBaseUnits('0.1', 6)).toBe(100000n);
    expect(toBaseUnits('0.000001', 6)).toBe(1n);
    expect(toBaseUnits('123456789.123456', 6)).toBe(123456789123456n);
  });

  it('rejects more fractional digits than the token supports', () => {
    expect(toBaseUnits('0.0000001', 6)).toBeNull();
    expect(toBaseUnits('1.5', 0)).toBeNull();
  });

  it('handles values beyond Number.MAX_SAFE_INTEGER', () => {
    const big = '9'.repeat(30);
    expect(fromBaseUnits(toBaseUnits(big, 6) as bigint, 6)).toBe(big);
  });

  it('formats base units back to a canonical decimal', () => {
    expect(fromBaseUnits(500000n, 6)).toBe('0.5');
    expect(fromBaseUnits(10000000n, 6)).toBe('10');
    expect(fromBaseUnits(1n, 6)).toBe('0.000001');
    expect(fromBaseUnits(0n, 6)).toBe('0');
    expect(fromBaseUnits(7n, 0)).toBe('7');
  });
});
