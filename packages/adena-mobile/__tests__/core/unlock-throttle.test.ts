import {AdenaStorage} from '@common/storage/storage';

import {
  checkPassword,
  delayAfter,
  unlockThrottle,
} from '../../src/core/unlock-throttle';

const values = new Map<string, any>();
AdenaStorage.local({
  get: async (key: string) => values.get(key),
  set: async (key: string, value: any) => {
    values.set(key, value);
  },
  remove: async (key: string) => {
    values.delete(key);
  },
  clear: async () => values.clear(),
});

beforeEach(() => values.clear());

const wrong = async () => false;

describe('unlock throttle', () => {
  it('waits after the fifth failure', async () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) {
      await checkPassword(wrong, () => now);
    }
    expect(await unlockThrottle.remainingMs(now)).toBe(0);

    await checkPassword(wrong, () => now);
    expect(await unlockThrottle.remainingMs(now)).toBe(delayAfter(5));
    expect(await unlockThrottle.remainingMs(now + delayAfter(5))).toBe(0);
  });

  it('never waits longer than the delay when the clock was ahead', async () => {
    // Failures recorded with the clock a year ahead, then the clock is fixed.
    const ahead = Date.UTC(2027, 9, 26);
    const fixed = Date.UTC(2026, 9, 26);
    for (let i = 0; i < 5; i++) {
      await checkPassword(wrong, () => ahead);
    }

    expect(await unlockThrottle.remainingMs(fixed)).toBe(delayAfter(5));
    const result = await checkPassword(
      async () => true,
      () => fixed,
    );
    expect(result).toEqual({ok: false, waitMs: delayAfter(5)});

    // The wait ends once the delay has passed on the corrected clock.
    const later = fixed + delayAfter(5);
    expect(await unlockThrottle.remainingMs(later)).toBe(0);
    expect(
      await checkPassword(
        async () => true,
        () => later,
      ),
    ).toEqual({ok: true});
  });
});
