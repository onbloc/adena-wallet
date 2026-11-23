import { AppError, AppErrorCode, isAppError } from '../../../src/core/errors';

describe('AppError', () => {
  it('defaults the message to the code', () => {
    const error = new AppError(AppErrorCode.WALLET_LOCKED);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('WALLET_LOCKED');
    expect(error.message).toBe('WALLET_LOCKED');
    expect('cause' in error).toBe(false);
  });

  it('keeps a custom message and cause', () => {
    const cause = new Error('inner');
    const error = new AppError(AppErrorCode.STORAGE_ERROR, 'outer', { cause });

    expect(error.message).toBe('outer');
    expect((error as { cause?: unknown }).cause).toBe(cause);
  });

  it('keeps falsy causes other than undefined', () => {
    expect((new AppError(AppErrorCode.STORAGE_ERROR, 'x', { cause: 0 }) as { cause?: unknown }).cause).toBe(0);
    expect('cause' in new AppError(AppErrorCode.STORAGE_ERROR, 'x', {})).toBe(false);
  });

  it('exposes every code as its own value', () => {
    for (const [key, value] of Object.entries(AppErrorCode)) {
      expect(key).toBe(value);
    }
  });
});

describe('isAppError', () => {
  it('matches app errors with or without a code', () => {
    const error = new AppError(AppErrorCode.INVALID_PASSWORD);

    expect(isAppError(error)).toBe(true);
    expect(isAppError(error, AppErrorCode.INVALID_PASSWORD)).toBe(true);
    expect(isAppError(error, AppErrorCode.WALLET_LOCKED)).toBe(false);
  });

  it.each([new Error('x'), { code: 'INVALID_PASSWORD' }, 'INVALID_PASSWORD', null, undefined])('rejects %p', (value) => {
    expect(isAppError(value)).toBe(false);
  });
});
