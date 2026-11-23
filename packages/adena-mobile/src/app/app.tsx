import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import React, { ReactElement, useState } from 'react';
import { Alert, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppFailurePage } from '../components/pages';
import { AppErrorCode, isAppError } from '../core/errors';
import { ContainerProvider, useContainer } from '../di/container-provider';
import { resetNativeGeneralStorage } from '../di/create-native-container';
import { useAutoLock } from '../hooks/use-auto-lock';
import { navigationRef } from '../navigation/navigation-ref';
import { RootNavigator } from '../navigation/root-navigator';
import { useNativeContainerQuery } from '../queries/boot.queries';
import { createQueryClient } from '../queries/query-client';
import { queryKeys } from '../queries/query-keys';
import { useSessionStore } from '../stores/session.store';
import { ErrorBoundary } from './error-boundary';
import { ToastHost } from './toast-host';

const queryClient = createQueryClient();

const AppShell = (): ReactElement => {
  const { walletService } = useContainer();
  const setStatus = useSessionStore(state => state.setStatus);

  // Hydrates the session store once per container from the persisted wallet state.
  useQuery({
    queryKey: queryKeys.sessionBootstrap(),
    queryFn: async () => {
      const status = await walletService.getStatus();

      setStatus(status);
      return status;
    },
    staleTime: Infinity,
  });

  const recordActivity = useAutoLock();

  // Touch events bubble here from every screen and reset the idle timer.

  return (
    <View style={styles.root} onTouchStart={recordActivity}>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
        <ToastHost />
      </NavigationContainer>
    </View>
  );
};

const confirmStorageReset = (onConfirm: () => void): void =>
  Alert.alert(
    'Reset app data?',
    'Accounts list, address book, custom networks and settings are removed. Your wallet stays on this device and unlocks with your password; accounts beyond the first of each phrase or key must be added again.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: onConfirm }],
  );

// Boot lives on its own client: the app client is cleared on lock/reset, which must not drop the container.
const bootQueryClient = createQueryClient();

const AppRoot = (): ReactElement => {
  const boot = useNativeContainerQuery();
  const container = boot.data ?? null;
  const [resetError, setResetError] = useState<unknown>();
  const bootError = resetError ?? (boot.isError ? boot.error : undefined);

  const retryBoot = (): void => {
    setResetError(undefined);
    boot.refetch();
  };

  const renderBootError = (): ReactElement => {
    if (isAppError(bootError, AppErrorCode.STORAGE_UNREADABLE)) {
      return (
        <AppFailurePage
          title='App data cannot be read'
          description={`${bootError.message} Adena did not start over, so nothing has been overwritten.`}
          actions={[
            { label: 'Try again', tone: 'secondary', onPress: retryBoot },
            {
              label: 'Reset app data',
              tone: 'destructive',
              onPress: () => confirmStorageReset(() => {
                resetNativeGeneralStorage().then(retryBoot).catch(setResetError);
              }),
            },
          ]}
        />
      );
    }

    const message = bootError instanceof Error ? bootError.message : String(bootError);

    return (
      <AppFailurePage
        title='Adena could not start'
        description={message}
        actions={[{ label: 'Try again', onPress: retryBoot }]}
      />
    );
  };

  const fallbackErrorBoundary = (reset: () => void): React.JSX.Element => (
    <AppFailurePage
      title='Something went wrong'
      description='The screen hit an unexpected error.'
      actions={[{ label: 'Reload', onPress: reset }]}
    />
  );

  return (
    <SafeAreaProvider>
      <StatusBar barStyle='dark-content' />
      {bootError !== undefined && renderBootError()}
      {container && (
        <ContainerProvider container={container}>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary
              fallback={fallbackErrorBoundary}
            >
              <AppShell />
            </ErrorBoundary>
          </QueryClientProvider>
        </ContainerProvider>
      )}
    </SafeAreaProvider>
  );
};

const App = (): ReactElement => (
  <QueryClientProvider client={bootQueryClient}>
    <AppRoot />
  </QueryClientProvider>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
