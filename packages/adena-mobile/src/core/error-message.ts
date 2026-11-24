import { isAppError } from './errors';

export const toErrorMessage = (error: unknown, fallback = 'Something went wrong. Try again.'): string => {
  if (isAppError(error)) {
    return error.message;
  }

  return error instanceof Error && error.message ? error.message : fallback;
};
