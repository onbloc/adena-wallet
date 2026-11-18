import { generateRandomHex } from './rand-utils';

// Bundles resolve Node's `crypto` to an empty module; the helper must not need it.
vi.mock('crypto', () => ({ default: {} }));

describe('generateRandomHex', () => {
  it('returns 32 random bytes as hex without Node crypto', () => {
    const first = generateRandomHex();

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(generateRandomHex()).not.toBe(first);
  });
});
