import { toBech32 } from '@cosmjs/encoding';

import { formatAddress, formatHash, getInitials, isValidAddress, normalizeAddress } from '../../../src/utils/address';

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

describe('normalizeAddress', () => {
  it('returns the canonical lowercase form of an all-uppercase address', () => {
    expect(normalizeAddress(VALID.toUpperCase())).toBe(VALID);
    expect(normalizeAddress(` ${VALID} `)).toBe(VALID);
  });

  it('rejects mixed case (BIP-173), other prefixes and malformed input', () => {
    expect(normalizeAddress(`G${VALID.slice(1)}`)).toBeNull();
    expect(normalizeAddress(VALID, 'atone')).toBeNull();
    expect(normalizeAddress('g1nope')).toBeNull();
  });

  it('keeps isValidAddress to the canonical form so uppercase is never signed as-is', () => {
    expect(isValidAddress(VALID.toUpperCase())).toBe(false);
  });
});

describe('formatAddress', () => {
  it('keeps the first and last six characters', () => {
    expect(formatAddress(VALID)).toBe('g1jg8m...fvsqf5');
  });

  it('keeps values shorter than 40 characters', () => {
    expect(formatAddress('1'.repeat(39))).toBe('1'.repeat(39));
    expect(formatAddress('1234567890'.repeat(4))).toBe('123456...567890');
    expect(formatAddress('')).toBe('');
  });

  it('supports a custom length', () => {
    expect(formatAddress(VALID, 4)).toBe('g1jg...sqf5');
  });
});

describe('formatHash', () => {
  it('keeps the first and last six characters', () => {
    expect(formatHash('A1B2C3D4E5F60718293A4B5C6D7E8F90')).toBe('A1B2C3...7E8F90');
  });

  it('keeps values too short to gain from the ellipsis', () => {
    expect(formatHash('123456789012345')).toBe('123456789012345');
    expect(formatHash('1234567890123456')).toBe('123456...123456');
  });
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
