import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useContainer } from '../di/container-provider';
import { useOnboardingStore } from '../stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { useToastStore } from '../stores/toast.store';

// Wipes persisted data, caches and client stores, then returns the app to onboarding.
export const useFactoryReset = (): (() => Promise<void>) => {
  const { appResetService } = useContainer();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await appResetService.resetAll();
    queryClient.clear();
    useOnboardingStore.getState().clear();
    useToastStore.getState().dismiss();
    useSessionStore.setState(state => ({ status: SessionStatus.EMPTY, revision: state.revision + 1 }));
  }, [appResetService, queryClient]);
};
