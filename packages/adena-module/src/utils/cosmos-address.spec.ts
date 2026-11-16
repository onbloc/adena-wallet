import { validateCosmosAddress } from './cosmos-address';

describe('validateCosmosAddress', () => {
  it('accepts address with matching prefix', () => {
    const addr = 'atone1qqqsyqcyq5rqwzqfpg9scrgwpugpzysndkda8p';
    expect(validateCosmosAddress(addr, 'atone')).toBe(true);
  });

  it('rejects address with different prefix', () => {
    const gnoAddr = 'g1qqqsyqcyq5rqwzqfpg9scrgwpugpzysns2desa';
    expect(validateCosmosAddress(gnoAddr, 'atone')).toBe(false);
  });

  it('rejects malformed bech32', () => {
    expect(validateCosmosAddress('not-a-bech32', 'atone')).toBe(false);
    expect(validateCosmosAddress('', 'atone')).toBe(false);
    expect(validateCosmosAddress('atone1invalid', 'atone')).toBe(false);
  });

  it('rejects when prefix is empty', () => {
    const addr = 'atone1qqx86kvt0q29tsqxqjq5tyfd8pnnn7ytpq2y93';
    expect(validateCosmosAddress(addr, '')).toBe(false);
  });
});
