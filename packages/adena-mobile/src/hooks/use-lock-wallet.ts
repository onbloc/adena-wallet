import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useContainer } from '../di/container-provider';
import { SessionStatus, useSessionStore } from '../stores/session.store';

// Closes the keyring session and drops cached wallet data; an unlocked session moves to the unlock screen.
export const useLockWallet = (): (() => void) => {
  const { walletService } = useContainer();
  const queryClient = useQueryClient();

  return useCallback(() => {
    walletService.lock();
    queryClient.clear();

    if (useSessionStore.getState().status === SessionStatus.UNLOCKED) {
      useSessionStore.getState().setStatus(SessionStatus.LOCKED);
    }
  }, [queryClient, walletService]);
};
