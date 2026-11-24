import { QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppFailurePage } from '../components/pages';
import { AppErrorCode, isAppError } from '../core/errors';
import { ContainerProvider } from '../di/container-provider';
import { resetNativeGeneralStorage } from '../di/create-native-container';
import { useNativeContainerQuery } from '../queries/boot.queries';
import { createQueryClient } from '../queries/query-client';
import { AppErrorBoundary } from './app-error-boundary';
import { AppShell } from './app-shell';
import { SystemThemeProvider } from './app-theme-provider';

const queryClient = createQueryClient();

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

  return (
    <SafeAreaProvider>
      <SystemThemeProvider>
        {bootError !== undefined && renderBootError()}
        {container && (
          <ContainerProvider container={container}>
            <QueryClientProvider client={queryClient}>
              <AppErrorBoundary>
                <AppShell />
              </AppErrorBoundary>
            </QueryClientProvider>
          </ContainerProvider>
        )}
      </SystemThemeProvider>
    </SafeAreaProvider>
  );
};

const App = (): ReactElement => (
  <QueryClientProvider client={bootQueryClient}>
    <AppRoot />
  </QueryClientProvider>
);

export default App;
