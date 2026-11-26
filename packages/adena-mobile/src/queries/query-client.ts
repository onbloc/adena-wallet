import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { AppErrorCode, isAppError } from '../core/errors';
import { SessionStatus, useSessionStore } from '../stores/session.store';

// The keyring can close under an unlocked UI (e.g. a JS reload keeps the store but not the session);
// any locked error then sends the user to the unlock screen instead of failing in place.
export const handleLockedError = (error: unknown): void => {
  if (isAppError(error, AppErrorCode.WALLET_LOCKED) && useSessionStore.getState().status === SessionStatus.UNLOCKED) {
    useSessionStore.getState().setStatus(SessionStatus.LOCKED);
  }
};

// Only the main app owns the session store; the Android inject sheet keeps its own lock lifecycle.
export const createQueryClient = ({ lockOnLockedError = false }: { lockOnLockedError?: boolean } = {}): QueryClient =>
  new QueryClient({
    ...(lockOnLockedError
      ? { queryCache: new QueryCache({ onError: handleLockedError }), mutationCache: new MutationCache({ onError: handleLockedError }) }
      : {}),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) =>
          !isAppError(error, AppErrorCode.INVALID_REQUEST) && !isAppError(error, AppErrorCode.WALLET_LOCKED) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
