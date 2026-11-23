import {
  addAmount,
  compareAmount,
  formatTokenAmount,
  isPositiveAmount,
  parseCoin,
  subtractAmount,
  toBaseUnit,
  toDisplayAmount,
} from '../../../src/utils/amount';

describe('toBaseUnit', () => {
  it('shifts by decimals and truncates extra precision', () => {
    expect(toBaseUnit('1.5', 6)).toBe('1500000');
    expect(toBaseUnit('0.0000019', 6)).toBe('1');
    expect(toBaseUnit('0', 6)).toBe('0');
    expect(toBaseUnit('12', 0)).toBe('12');
  });

  it('never switches to exponential notation for huge values', () => {
    expect(toBaseUnit('123456789012345678901234567890', 18)).toBe(`123456789012345678901234567890${'0'.repeat(18)}`);
  });

  it.each(['', 'abc', '-1', 'Infinity', 'NaN', '1,000'])('throws on invalid amount %p', (value) => {
    expect(() => toBaseUnit(value, 6)).toThrow(`invalid amount: ${value}`);
  });
});

describe('toDisplayAmount', () => {
  it('shifts down without rounding', () => {
    expect(toDisplayAmount('1500001', 6)).toBe('1.500001');
    expect(toDisplayAmount('1', 18)).toBe('0.000000000000000001');
  });

  it('treats an empty value as zero', () => {
    expect(toDisplayAmount('', 6)).toBe('0');
  });

  it('returns NaN for garbage input', () => {
    expect(toDisplayAmount('xyz', 6)).toBe('NaN');
  });
});

describe('formatTokenAmount', () => {
  it('returns 0 for zero and empty values', () => {
    expect(formatTokenAmount('0', 6)).toBe('0');
    expect(formatTokenAmount('', 6)).toBe('0');
  });

  it('groups thousands and keeps all decimals by default', () => {
    expect(formatTokenAmount('1234567890123', 6)).toBe('1,234,567.890123');
  });

  it('truncates to maxFractionDigits', () => {
    expect(formatTokenAmount('1234567', 6, 2)).toBe('1.23');
    expect(formatTokenAmount('1999999', 6, 0)).toBe('1');
  });

  it('keeps full precision when rounding would hide a non-zero balance', () => {
    expect(formatTokenAmount('1', 6, 2)).toBe('0.000001');
  });

  it('formats negative values', () => {
    expect(formatTokenAmount('-1500000', 6)).toBe('-1.5');
  });
});

describe('compareAmount', () => {
  it('compares numerically', () => {
    expect(compareAmount('10', '9')).toBe(1);
    expect(compareAmount('9', '10')).toBe(-1);
    expect(compareAmount('1.0', '1')).toBe(0);
  });

  it('returns 0 when either side is not a number', () => {
    expect(compareAmount('abc', '1')).toBe(0);
  });
});

describe('addAmount / subtractAmount', () => {
  it('adds big integers exactly', () => {
    expect(addAmount('99999999999999999999', '1')).toBe('100000000000000000000');
  });

  it('subtracts and floors negative results at zero', () => {
    expect(subtractAmount('10', '3')).toBe('7');
    expect(subtractAmount('3', '10')).toBe('0');
    expect(subtractAmount('3', '3')).toBe('0');
  });
});

describe('isPositiveAmount', () => {
  it.each([['1', true], ['0.000001', true], ['0', false], ['-1', false], ['', false], ['abc', false], ['Infinity', false]])('%p -> %p', (value, expected) => {
    expect(isPositiveAmount(value)).toBe(expected);
  });
});

describe('parseCoin', () => {
  it('splits amount and denom', () => {
    expect(parseCoin('100ugnot')).toEqual({ amount: '100', denom: 'ugnot' });
    expect(parseCoin('  5ibc/ABC  '.toLowerCase())).toEqual({ amount: '5', denom: 'ibc/abc' });
    expect(parseCoin('7gno.land/r/demo/foo:bar')).toEqual({ amount: '7', denom: 'gno.land/r/demo/foo:bar' });
  });

  it.each(['', 'ugnot', '100', '100ab', '1.5ugnot', '-1ugnot', '100UGNOT', '100 ugnot', '10ugnot!'])('returns null for %p', (value) => {
    expect(parseCoin(value)).toBeNull();
  });
});
