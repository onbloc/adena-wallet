import { toErrorMessage } from '../../../src/core/error-message';
import { AppError, AppErrorCode } from '../../../src/core/errors';

describe('toErrorMessage', () => {
  it('returns app error messages', () => {
    expect(toErrorMessage(new AppError(AppErrorCode.INVALID_PASSWORD, 'Wrong password'))).toBe('Wrong password');
  });

  it('returns plain error messages', () => {
    expect(toErrorMessage(new TypeError('boom'))).toBe('boom');
  });

  it('falls back for empty messages and non-errors', () => {
    expect(toErrorMessage(new Error(''))).toBe('Something went wrong. Try again.');
    expect(toErrorMessage('string error')).toBe('Something went wrong. Try again.');
    expect(toErrorMessage(null)).toBe('Something went wrong. Try again.');
    expect(toErrorMessage({ message: 'not an error' }, 'Custom')).toBe('Custom');
  });
});
