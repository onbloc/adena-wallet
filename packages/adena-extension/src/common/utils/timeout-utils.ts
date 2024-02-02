import { CommonError } from '@common/errors/common';

export const DEFAULT_TIMEOUT = 1500 as const;

export async function waitForRun<T = undefined>(
  promise: Promise<T>,
  milliseconds?: number,
): Promise<T> {
  milliseconds = milliseconds ?? DEFAULT_TIMEOUT;
  let timer: number | NodeJS.Timeout;
  const response = await Promise.all([
    promise,
    new Promise<'done'>((resolve) => {
      timer = setTimeout(() => resolve('done'), milliseconds);
    }),
  ] as const)
    .catch((e) => {
      console.error(e);
      return [null, null];
    })
    .finally(() => clearTimeout(timer));

  if (response[1] !== 'done') {
    throw new CommonError('FAILED_TO_RUN');
  }
  return response[0] as T;
}
