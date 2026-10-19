import {AdenaStorage} from '@common/storage/storage';

const KEY = 'MOBILE_UNLOCK_FAILURES';
const FREE_ATTEMPTS = 5;
const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 60 * 60_000;

interface Failures {
  count: number;
  lockedUntil: number;
}

const storage = () => AdenaStorage.local<string>();

async function read(): Promise<Failures> {
  const value = (await storage()
    .getToObject(KEY)
    .catch(() => null)) as Failures | null;
  return value && typeof value.count === 'number'
    ? value
    : {count: 0, lockedUntil: 0};
}

/** Delay before the next attempt after `count` failures: none for the first five, then doubling. */
export function delayAfter(count: number): number {
  if (count < FREE_ATTEMPTS) {
    return 0;
  }
  return Math.min(BASE_DELAY_MS * 2 ** (count - FREE_ATTEMPTS), MAX_DELAY_MS);
}

/**
 * Persists failed unlock attempts so restarting the app does not reset the
 * wait. Slows down someone guessing passwords on a stolen, unlocked phone.
 */
export const unlockThrottle = {
  async remainingMs(now = Date.now()): Promise<number> {
    const {lockedUntil} = await read();
    return Math.max(0, lockedUntil - now);
  },
  async recordFailure(now = Date.now()): Promise<number> {
    const {count} = await read();
    const next = count + 1;
    const lockedUntil = now + delayAfter(next);
    await storage().setByObject(KEY, {count: next, lockedUntil});
    return lockedUntil - now;
  },
  async reset(): Promise<void> {
    await storage().remove(KEY);
  },
};

export type PasswordCheck = {ok: true} | {ok: false; waitMs: number};

/**
 * Runs one password check under the shared limit. Every place that takes the
 * wallet password goes through here (unlock, re-authentication, revealing
 * the phrase, password change, enabling biometrics), so an unlocked phone
 * gives no way around the wait. While the wait lasts `check` does not run.
 */
export async function checkPassword(
  check: () => Promise<boolean>,
  now = Date.now,
): Promise<PasswordCheck> {
  const remaining = await unlockThrottle.remainingMs(now());
  if (remaining > 0) {
    return {ok: false, waitMs: remaining};
  }
  if (await check()) {
    await unlockThrottle.reset();
    return {ok: true};
  }
  return {ok: false, waitMs: await unlockThrottle.recordFailure(now())};
}

export function passwordErrorMessage(waitMs: number): string {
  return waitMs > 0
    ? `Too many attempts. Try again in ${Math.ceil(waitMs / 1000)} seconds.`
    : 'The password is incorrect.';
}
