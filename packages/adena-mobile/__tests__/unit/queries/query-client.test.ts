import { AppError, AppErrorCode } from '../../../src/core/errors';
import { createQueryClient } from '../../../src/queries/query-client';

describe('createQueryClient', () => {
  const options = createQueryClient().getDefaultOptions();
  const retry = options.queries?.retry as (failureCount: number, error: unknown) => boolean;

  it('sets cache timings and disables mutation retries', () => {
    expect(options.queries?.staleTime).toBe(15_000);
    expect(options.queries?.gcTime).toBe(300_000);
    expect(options.mutations?.retry).toBe(false);
  });

  it('retries generic errors twice', () => {
    expect(retry(0, new Error('x'))).toBe(true);
    expect(retry(1, new AppError(AppErrorCode.NETWORK_ERROR))).toBe(true);
    expect(retry(2, new Error('x'))).toBe(false);
  });

  it('never retries invalid requests', () => {
    expect(retry(0, new AppError(AppErrorCode.INVALID_REQUEST))).toBe(false);
  });

  it('returns a new client per call', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
