import {normalizePrivateKey} from '../../src/core/private-key';

const KEY = 'a'.repeat(64);

describe('normalizePrivateKey', () => {
  it('accepts 64 hex characters with or without 0x', () => {
    expect(normalizePrivateKey(KEY)).toBe(KEY);
    expect(normalizePrivateKey(`  0x${KEY.toUpperCase()} `)).toBe(KEY);
  });

  it('rejects keys that Buffer.from(hex) would silently truncate', () => {
    expect(
      normalizePrivateKey(`${'a'.repeat(32)}zz${'a'.repeat(30)}`),
    ).toBeNull();
    expect(normalizePrivateKey('a'.repeat(63))).toBeNull();
    expect(normalizePrivateKey('a'.repeat(65))).toBeNull();
    expect(normalizePrivateKey('')).toBeNull();
  });
});
