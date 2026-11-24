import { QueryClient } from '@tanstack/react-query';

import { AppErrorCode, isAppError } from '../core/errors';

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => !isAppError(error, AppErrorCode.INVALID_REQUEST) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
