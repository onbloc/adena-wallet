import { AppError, isAppError } from '../../../src/core/errors';
import { PasswordAttemptRepository, PasswordAttemptState } from '../../../src/repositories/password-attempt.repository';
import { delayAfter, FREE_PASSWORD_ATTEMPTS, PasswordAttemptLimiter } from '../../../src/services/password-attempt-limiter';
import { catchError } from '../../helpers/service-fakes';

class MemoryAttemptRepository implements PasswordAttemptRepository {
  state: PasswordAttemptState = { failures: 0, lockedUntil: 0 };
  clear = jest.fn(async () => {
    this.state = { failures: 0, lockedUntil: 0 };
  });

  async get(): Promise<PasswordAttemptState> {
    return this.state;
  }

  async save(state: PasswordAttemptState): Promise<void> {
    this.state = state;
  }
}

const wrongPassword = async (): Promise<never> => {
  throw new AppError('INVALID_PASSWORD');
};

const setup = (start = 1_000_000) => {
  const clock = { now: start };
  const repository = new MemoryAttemptRepository();

  return { clock, repository, limiter: new PasswordAttemptLimiter(repository, () => clock.now) };
};

const fail = (limiter: PasswordAttemptLimiter, times: number) =>
  Array.from({ length: times }).reduce<Promise<unknown>>(previous => previous.then(() => catchError(() => limiter.run(wrongPassword))), Promise.resolve());

describe('delayAfter', () => {
  it('is free for the first attempts, then doubles from 30s and caps at an hour', () => {
    expect(delayAfter(0)).toBe(0);
    expect(delayAfter(FREE_PASSWORD_ATTEMPTS)).toBe(0);
    expect(delayAfter(FREE_PASSWORD_ATTEMPTS + 1)).toBe(30_000);
    expect(delayAfter(FREE_PASSWORD_ATTEMPTS + 3)).toBe(120_000);
    expect(delayAfter(FREE_PASSWORD_ATTEMPTS + 8)).toBe(60 * 60 * 1000);
    expect(delayAfter(1000)).toBe(60 * 60 * 1000);
  });
});

describe('PasswordAttemptLimiter', () => {
  it('has no wait on a clean state', async () => {
    const { limiter } = setup();

    await expect(limiter.remainingMs()).resolves.toBe(0);
  });

  it('returns the check result and clears earlier failures on success', async () => {
    const { limiter, repository } = setup();

    await fail(limiter, 2);
    expect(repository.state.failures).toBe(2);
    await expect(limiter.run(async () => 'ok')).resolves.toBe('ok');
    expect(repository.state).toEqual({ failures: 0, lockedUntil: 0 });
  });

  it('skips the storage write when there is nothing to reset', async () => {
    const { limiter, repository } = setup();

    await limiter.reset();
    expect(repository.clear).not.toHaveBeenCalled();
    repository.state = { failures: 0, lockedUntil: 5 };
    await limiter.reset();
    expect(repository.clear).toHaveBeenCalledTimes(1);
  });

  it('only counts wrong passwords as failures', async () => {
    const { limiter, repository } = setup();
    const other = await catchError(() => limiter.run(async () => {
      throw new AppError('STORAGE_ERROR');
    }));
    const plain = await catchError(() => limiter.run(async () => {
      throw new Error('boom');
    }));

    expect(isAppError(other, 'STORAGE_ERROR')).toBe(true);
    expect(plain).toEqual(new Error('boom'));
    expect(repository.state.failures).toBe(0);
  });

  it('allows the free attempts without waiting, then locks for 30 seconds', async () => {
    const { limiter, clock } = setup();

    await fail(limiter, FREE_PASSWORD_ATTEMPTS);
    await expect(limiter.remainingMs()).resolves.toBe(0);
    await fail(limiter, 1);
    await expect(limiter.remainingMs()).resolves.toBe(30_000);

    const check = jest.fn(async () => 'ok');
    const blocked = await catchError(() => limiter.run(check));

    expect(isAppError(blocked, 'PASSWORD_ATTEMPTS_EXCEEDED')).toBe(true);
    expect((blocked as Error).message).toBe('Too many attempts. Try again in 30 seconds.');
    expect(check).not.toHaveBeenCalled();

    clock.now += 29_500;
    expect(((await catchError(() => limiter.run(check))) as Error).message).toContain('1 seconds');
    clock.now += 500;
    await expect(limiter.run(check)).resolves.toBe('ok');
  });

  it('doubles the wait and reports minutes', async () => {
    const { limiter, clock, repository } = setup();

    await fail(limiter, FREE_PASSWORD_ATTEMPTS + 1);
    clock.now += 30_000;
    await fail(limiter, 1);
    expect(repository.state.lockedUntil - clock.now).toBe(60_000);
    expect(((await catchError(() => limiter.run(wrongPassword))) as Error).message).toBe('Too many attempts. Try again in 1 minutes.');
    clock.now += 60_000;
    await fail(limiter, 1);
    expect(((await catchError(() => limiter.run(wrongPassword))) as Error).message).toBe('Too many attempts. Try again in 2 minutes.');
    // A blocked attempt is not counted as another failure.
    expect(repository.state.failures).toBe(FREE_PASSWORD_ATTEMPTS + 3);
  });

  it('re-anchors a deadline pushed into the future by a clock rollback', async () => {
    const { limiter, clock, repository } = setup();

    await fail(limiter, FREE_PASSWORD_ATTEMPTS + 1);
    clock.now -= 24 * 60 * 60 * 1000;
    await expect(limiter.remainingMs()).resolves.toBe(30_000);
    expect(repository.state.lockedUntil).toBe(clock.now + 30_000);
    clock.now += 30_000;
    await expect(limiter.remainingMs()).resolves.toBe(0);
  });

  it('defaults to the wall clock', async () => {
    const repository = new MemoryAttemptRepository();
    const limiter = new PasswordAttemptLimiter(repository);

    repository.state = { failures: FREE_PASSWORD_ATTEMPTS + 1, lockedUntil: Date.now() + 10_000 };
    const remaining = await limiter.remainingMs();

    expect(remaining).toBeGreaterThan(9_000);
    expect(remaining).toBeLessThanOrEqual(10_000);
  });

  it('serializes attempts across limiter instances, so a second container cannot guess during the check', async () => {
    const { clock, repository, limiter } = setup();
    const other = new PasswordAttemptLimiter(repository, () => clock.now);
    let release: () => void = () => undefined;
    const slowWrong = () => new Promise<never>((_, reject) => {
      release = () => reject(new AppError('INVALID_PASSWORD'));
    });
    const otherCheck = jest.fn(wrongPassword);

    repository.state = { failures: FREE_PASSWORD_ATTEMPTS, lockedUntil: 0 };
    const first = catchError(() => limiter.run(slowWrong));
    const second = catchError(() => other.run(otherCheck));

    await new Promise(resolve => setTimeout(resolve, 0));
    release();
    await first;
    expect(isAppError(await second, 'PASSWORD_ATTEMPTS_EXCEEDED')).toBe(true);
    expect(otherCheck).not.toHaveBeenCalled();
    expect(repository.state.failures).toBe(FREE_PASSWORD_ATTEMPTS + 1);
  });

  it('records the failure before the check runs and undoes it on success', async () => {
    const { limiter, repository } = setup();
    let seen: PasswordAttemptState | undefined;

    await limiter.run(async () => {
      seen = repository.state;
      return 'ok';
    });
    // Another JS runtime reading during the check already sees this attempt counted.
    expect(seen?.failures).toBe(1);
    expect(repository.state).toEqual({ failures: 0, lockedUntil: 0 });
  });
});
