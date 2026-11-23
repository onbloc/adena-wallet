// eslint-disable-next-line @typescript-eslint/no-require-imports
const shim = require('../../../src/shims/crypto.js');

describe('crypto shim', () => {
  it('fills arrays in place', () => {
    const array = new Uint8Array(16);
    const result = shim.randomFillSync(array);

    expect(result).toBe(array);
    expect(array.some((byte: number) => byte !== 0)).toBe(true);
  });

  it('returns random bytes of the given size', () => {
    expect(shim.randomBytes(0)).toHaveLength(0);
    expect(shim.randomBytes(32)).toHaveLength(32);
    expect(Buffer.from(shim.randomBytes(32)).equals(Buffer.from(shim.randomBytes(32)))).toBe(false);
  });

  it('exposes the same functions as the default export', () => {
    expect(shim.default.randomBytes).toBe(shim.randomBytes);
    expect(shim.default.randomFillSync).toBe(shim.randomFillSync);
  });
});
