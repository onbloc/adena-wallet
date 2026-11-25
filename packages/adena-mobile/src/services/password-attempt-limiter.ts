import { AppError, AppErrorCode, isAppError } from '../core/errors';
import { PasswordAttemptRepository, PasswordAttemptState } from '../repositories/password-attempt.repository';
import { SerialQueue } from '../utils/serial-queue';

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

// Shared by every limiter in the JS runtime: the main app and each inject sheet build their own container.
const attemptQueue = new SerialQueue();

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

  // Deadline check, password check and failure update run as one queued step, so overlapping
  // attempts each see the failures recorded before them.
  run<T>(check: () => Promise<T>): Promise<T> {
    return attemptQueue.run(() => this.attempt(check));
  }

  private async attempt<T>(check: () => Promise<T>): Promise<T> {
    const remaining = await this.remainingMs();

    if (remaining > 0) {
      throw new AppError(AppErrorCode.PASSWORD_ATTEMPTS_EXCEEDED, `Too many attempts. Try again in ${formatWait(remaining)}.`);
    }

    // Counted as a failure before the slow check, so a reader elsewhere (or a killed process) cannot get a free guess.
    const before = await this.repository.get();
    const pending = { failures: before.failures + 1, lockedUntil: this.now() + delayAfter(before.failures + 1) };

    await this.repository.save(pending);

    try {
      const result = await check();

      await this.reset();
      return result;
    }
    catch (error) {
      if (!isAppError(error, AppErrorCode.INVALID_PASSWORD)) {
        await this.undo(pending, before);
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

  // Not a password failure: restores the earlier state unless another attempt changed it since.
  private async undo(pending: PasswordAttemptState, before: PasswordAttemptState): Promise<void> {
    const current = await this.repository.get();

    if (current.failures === pending.failures && current.lockedUntil === pending.lockedUntil) {
      await this.repository.save(before);
    }
  }
}
