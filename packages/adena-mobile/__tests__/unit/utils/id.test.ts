import { createId, randomBytes } from '../../../src/utils/id';

describe('randomBytes', () => {
  it('returns the requested number of bytes', () => {
    expect(randomBytes(0)).toHaveLength(0);
    expect(randomBytes(32)).toHaveLength(32);
  });

  it('fills the buffer from crypto.getRandomValues', () => {
    const spy = jest.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint8Array).fill(7);

      return array;
    });

    expect(Array.from(randomBytes(3))).toEqual([7, 7, 7]);
    spy.mockRestore();
  });
});

describe('createId', () => {
  it('returns 32 lowercase hex characters', () => {
    expect(createId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is unique across calls', () => {
    const ids = new Set(Array.from({ length: 100 }, createId));

    expect(ids.size).toBe(100);
  });
});
