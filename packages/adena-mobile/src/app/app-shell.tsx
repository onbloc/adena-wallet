import { NavigationContainer } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import React, { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppFailurePage } from '../components/pages';
import { toErrorMessage } from '../core/error-message';
import { useContainer } from '../di/container-provider';
import { useAutoLock } from '../hooks/use-auto-lock';
import { HapticsContext } from '../hooks/use-haptics';
import { navigationRef } from '../navigation/navigation-ref';
import { RootNavigator } from '../navigation/root-navigator';
import { queryKeys } from '../queries/query-keys';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { AppThemeProvider } from './app-theme-provider';
import { ToastHost } from './toast-host';

export const AppShell = (): ReactElement => {
  const { walletService, hapticsService } = useContainer();
  const status = useSessionStore(state => state.status);

  // Hydrates the session store from the persisted wallet state. A refetch after the cache is
  // cleared on lock/reset must not override the status those flows already set.
  const bootstrap = useQuery({
    queryKey: queryKeys.sessionBootstrap(),
    queryFn: async () => {
      const walletStatus = await walletService.getStatus();
      const session = useSessionStore.getState();

      if (session.status === SessionStatus.BOOTING) {
        session.setStatus(walletStatus);
      }

      return walletStatus;
    },
    staleTime: Infinity,
  });

  const recordActivity = useAutoLock();

  const retryBootstrap = (): void => {
    bootstrap.refetch();
  };

  if (status === SessionStatus.BOOTING && bootstrap.isError) {
    return (
      <AppFailurePage
        title='Adena could not start'
        description={toErrorMessage(bootstrap.error)}
        actions={[{ label: 'Try again', onPress: retryBootstrap }]}
      />
    );
  }

  // Touch events bubble here from every screen and reset the idle timer.

  return (
    <AppThemeProvider>
      <HapticsContext value={hapticsService.play}>
        <View style={styles.root} onTouchStart={recordActivity}>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
            <ToastHost />
          </NavigationContainer>
        </View>
      </HapticsContext>
    </AppThemeProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
