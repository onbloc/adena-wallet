import { pickTwoDistinctIndexes } from './validate-mnemonic-step';

describe('pickTwoDistinctIndexes', () => {
  afterEach(() => {
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('returns two distinct indexes', () => {
    for (let i = 0; i < 100; i++) {
      const [a, b] = pickTwoDistinctIndexes(12);
      expect(a).not.toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(12);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(12);
    }
  });

  it('returns indexes in ascending order', () => {
    for (let i = 0; i < 100; i++) {
      const [a, b] = pickTwoDistinctIndexes(12);
      expect(a).toBeLessThan(b);
    }
  });

  it('shifts the second index when the raw draw would collide with the first', () => {
    // Math.random sequence: 0.5 (first index → 6), 0.5 (second raw → 5,
    // shifted to 6+1=7 because 5 < 6 is false... wait 5 < 6 is true).
    // Use clearer values: first = 0.0 → 0, second raw = 0.0 → 0, shifted to 1.
    const spy = jest.spyOn(Math, 'random');
    spy.mockReturnValueOnce(0);
    spy.mockReturnValueOnce(0);
    expect(pickTwoDistinctIndexes(12)).toEqual([0, 1]);
  });

  it('keeps the second index unchanged when it is already below the first', () => {
    const spy = jest.spyOn(Math, 'random');
    // first = 0.5 → 6, second raw = 0.0 → 0, 0 < 6 so no shift → [0, 6]
    spy.mockReturnValueOnce(0.5);
    spy.mockReturnValueOnce(0);
    expect(pickTwoDistinctIndexes(12)).toEqual([0, 6]);
  });

  it('throws when total is less than 2', () => {
    expect(() => pickTwoDistinctIndexes(1)).toThrow();
    expect(() => pickTwoDistinctIndexes(0)).toThrow();
  });
});
