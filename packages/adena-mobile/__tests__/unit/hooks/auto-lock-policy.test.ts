import { shouldAutoLock } from '../../../src/hooks/auto-lock-policy';

describe('shouldAutoLock', () => {
  it.each([
    [0, 999, 1000, false],
    [0, 1000, 1000, true],
    [0, 5000, 1000, true],
    [1000, 500, 1000, true],
    [1000, 1000, 1000, false],
  ])('since %p now %p window %p → %p', (since, now, windowMs, expected) => {
    expect(shouldAutoLock(since, now, windowMs)).toBe(expected);
  });
});
