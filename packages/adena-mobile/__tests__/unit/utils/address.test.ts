import { toBech32 } from '@cosmjs/encoding';

import { getInitials, isValidAddress, shortenAddress } from '../../../src/utils/address';

const VALID = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

describe('isValidAddress', () => {
  it('accepts a 20-byte bech32 address with the default prefix', () => {
    expect(isValidAddress(VALID)).toBe(true);
  });

  it('honors a custom prefix', () => {
    const atone = toBech32('atone', new Uint8Array(20).fill(1));

    expect(isValidAddress(atone, 'atone')).toBe(true);
    expect(isValidAddress(atone)).toBe(false);
    expect(isValidAddress(VALID, 'atone')).toBe(false);
  });

  it('rejects wrong data lengths', () => {
    expect(isValidAddress(toBech32('g', new Uint8Array(19)))).toBe(false);
    expect(isValidAddress(toBech32('g', new Uint8Array(32)))).toBe(false);
  });

  it.each(['', 'g1', 'not an address', `${VALID.slice(0, -1)}x`, VALID.toUpperCase().slice(0, 10), '🙂'])('rejects malformed input %p', (value) => {
    expect(isValidAddress(value)).toBe(false);
  });
});

describe('shortenAddress', () => {
  it('shortens long values with the default head and tail', () => {
    expect(shortenAddress(VALID)).toBe('g1jg8m…sqf5');
  });

  it('keeps values at or below head + tail + 1 characters', () => {
    expect(shortenAddress('12345678901')).toBe('12345678901');
    expect(shortenAddress('123456789012')).toBe('123456…9012');
    expect(shortenAddress('')).toBe('');
  });

  it('supports custom head and tail', () => {
    expect(shortenAddress(VALID, 3, 3)).toBe('g1j…qf5');
  });

  it.todo('tail = 0 should not append the full address (slice(-0) returns the whole string)');
});

describe('getInitials', () => {
  it('returns ? for empty or whitespace names', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   \t\n')).toBe('?');
  });

  it('uses the first two letters of a single word', () => {
    expect(getInitials('adena')).toBe('AD');
    expect(getInitials('a')).toBe('A');
  });

  it('uses the first letter of the first two words', () => {
    expect(getInitials('  main   wallet  three ')).toBe('MW');
  });

  it('upper-cases non-ascii letters', () => {
    expect(getInitials('éclair ünder')).toBe('ÉÜ');
  });

  it.todo('should keep astral-plane characters (emoji) intact instead of splitting surrogate pairs');
});
