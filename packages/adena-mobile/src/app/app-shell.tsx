import { DarkTheme, DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import React, { ReactElement, ReactNode, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppFailurePage } from '../components/pages';
import { toErrorMessage } from '../core/error-message';
import { useContainer } from '../di/container-provider';
import { useAppTheme } from '../hooks/use-app-theme';
import { useAutoLock } from '../hooks/use-auto-lock';
import { useDeepLinkHandler } from '../hooks/use-deep-link-handler';
import { HapticsContext } from '../hooks/use-haptics';
import { useNotificationSync } from '../hooks/use-notification-sync';
import { navigationRef } from '../navigation/navigation-ref';
import { RootNavigator } from '../navigation/root-navigator';
import { queryKeys } from '../queries/query-keys';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { themeColors } from '../theme';
import { AppThemeProvider } from './app-theme-provider';
import { ToastHost } from './toast-host';

// Navigation chrome (scene backgrounds, transitions) follows the resolved scheme.
const ThemedNavigationContainer = ({ children, onReady }: { children: ReactNode; onReady?: () => void }): ReactElement => {
  const { scheme } = useAppTheme();
  const theme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const colors = themeColors[scheme];

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.action.primary,
        background: colors.background.canvas,
        card: colors.background.surface,
        text: colors.text.primary,
        border: colors.border.subtle,
        notification: colors.status.error,
      },
    };
  }, [scheme]);

  return <NavigationContainer ref={navigationRef} theme={theme} onReady={onReady}>{children}</NavigationContainer>;
};

export const AppShell = (): ReactElement => {
  const { walletService, hapticsService } = useContainer();
  const status = useSessionStore(state => state.status);
  const [navigationReady, setNavigationReady] = useState(false);

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

  useDeepLinkHandler(navigationReady);
  useNotificationSync();

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

  const handleReady = (): void => setNavigationReady(true);

  // Touch events bubble here from every screen and reset the idle timer.
  return (
    <AppThemeProvider>
      <HapticsContext value={hapticsService.play}>
        <View style={styles.root} onTouchStart={recordActivity}>
          <ThemedNavigationContainer onReady={handleReady}>
            <RootNavigator />
            <ToastHost />
          </ThemedNavigationContainer>
        </View>
      </HapticsContext>
    </AppThemeProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
