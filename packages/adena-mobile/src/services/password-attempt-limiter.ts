import { AppError, AppErrorCode, isAppError } from '../core/errors';
import { PasswordAttemptRepository } from '../repositories/password-attempt.repository';

export const FREE_PASSWORD_ATTEMPTS = 4;
const BASE_DELAY_MS = 30 * 1000;
const MAX_DELAY_MS = 60 * 60 * 1000;

// Back-off after the free attempts: 30 s, doubling, capped at one hour.
export const delayAfter = (failures: number): number => {
  if (failures <= FREE_PASSWORD_ATTEMPTS) {
    return 0;
  }

  return Math.min(BASE_DELAY_MS * 2 ** (failures - FREE_PASSWORD_ATTEMPTS - 1), MAX_DELAY_MS);
};

const formatWait = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000);

  return seconds < 60 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`;
};

// One persisted attempt limit for every password check (unlock, reveal, remove, settings, inject sheet).
export class PasswordAttemptLimiter {
  constructor(
    private readonly repository: PasswordAttemptRepository,
    private readonly now: () => number = Date.now,
  ) {}

  // A deadline further away than the policy delay means the clock moved back; it is re-anchored
  // to now so the wait still runs out instead of lasting until the old future time.
  async remainingMs(): Promise<number> {
    const { failures, lockedUntil } = await this.repository.get();
    const now = this.now();
    const delay = delayAfter(failures);

    if (lockedUntil - now > delay) {
      await this.repository.save({ failures, lockedUntil: now + delay });
      return delay;
    }

    return Math.max(0, lockedUntil - now);
  }

  async run<T>(check: () => Promise<T>): Promise<T> {
    const remaining = await this.remainingMs();

    if (remaining > 0) {
      throw new AppError(AppErrorCode.PASSWORD_ATTEMPTS_EXCEEDED, `Too many attempts. Try again in ${formatWait(remaining)}.`);
    }

    try {
      const result = await check();

      await this.reset();
      return result;
    }
    catch (error) {
      if (isAppError(error, AppErrorCode.INVALID_PASSWORD)) {
        await this.recordFailure();
      }

      throw error;
    }
  }

  async reset(): Promise<void> {
    const state = await this.repository.get();

    if (state.failures > 0 || state.lockedUntil > 0) {
      await this.repository.clear();
    }
  }

  private async recordFailure(): Promise<void> {
    const { failures } = await this.repository.get();
    const next = failures + 1;

    await this.repository.save({ failures: next, lockedUntil: this.now() + delayAfter(next) });
  }
}
