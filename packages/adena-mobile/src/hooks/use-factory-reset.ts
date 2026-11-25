import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { toErrorMessage } from '../core/error-message';
import { useContainer } from '../di/container-provider';
import { useDappRequestStore } from '../stores/dapp-request.store';
import { useOnboardingStore } from '../stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { useToastStore } from '../stores/toast.store';

// Wipes persisted data, caches and client stores, then returns the app to onboarding.
export const useFactoryReset = (): (() => Promise<void>) => {
  const { appResetService, walletService } = useContainer();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const statusBefore = useSessionStore.getState().status;

    try {
      await appResetService.resetAll();
    }
    catch (error) {
      // The session is already closed and data may be half removed: follow what is actually stored.
      queryClient.clear();
      const status = await walletService.getStatus().catch(() => SessionStatus.LOCKED);

      useSessionStore.getState().setStatus(status);

      // A status change swaps the navigator and unmounts the reset screen, so report it globally.
      if (status !== statusBefore) {
        useToastStore.getState().show(`Reset failed: ${toErrorMessage(error)}`, 'error');
      }

      throw error;
    }

    queryClient.clear();
    useDappRequestStore.setState({ queue: [], active: null, inFlight: false });
    useOnboardingStore.getState().clear();
    useToastStore.getState().dismiss();
    useSessionStore.setState(state => ({ status: SessionStatus.EMPTY, revision: state.revision + 1 }));
  }, [appResetService, queryClient, walletService]);
};
