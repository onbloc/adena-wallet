import { QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../../app/error-boundary';
import { InjectSheetPage } from '../../components/pages';
import { ContainerProvider } from '../../di/container-provider';
import NativeAdenaInjectSheet from '../../native/NativeAdenaInjectSheet';
import { useNativeContainerQuery } from '../../queries/boot.queries';
import { createQueryClient } from '../../queries/query-client';
import { finishSheet, InjectSheetScreen, sheetApproval } from '../inject-sheet-screen';

export interface InjectSheetAppProps {
  requestUrl?: string;
}

// Separate root for the Android overlay. It owns its own container, so its keyring
// session is independent of (and never unlocked by) the main wallet UI.
const InjectSheetRoot = ({ requestUrl }: InjectSheetAppProps): ReactElement | null => {
  const boot = useNativeContainerQuery();
  const container = boot.data ?? null;
  const bootError = boot.isError ? String((boot.error as Error)?.message ?? boot.error) : undefined;
  const [queryClient] = useState(createQueryClient);

  // The window is transparent, so a failed boot must still render something the user can close.
  const handleApprove = (): void => undefined;

  const handleReject = (): void | undefined => NativeAdenaInjectSheet?.dismiss();

  if (bootError) {
    return (
      <SafeAreaProvider>
        <InjectSheetPage
          title=''
          rows={[]}
          messages={[]}
          loading={false}
          unavailable={{ title: 'Adena could not start', description: bootError }}
          approveLabel=''
          approving={false}
          canApprove={false}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </SafeAreaProvider>
    );
  }

  if (!container) {
    return null;
  }

  const fallbackErrorBoundary = (): null => null;

  const handleError = (error: unknown): void => {
    if (sheetApproval.inFlight) {
      return;
    }

    try {
      const request = requestUrl ? container.dappService.parseRequestUrl(requestUrl) : null;

      finishSheet(request ? container.dappService.fail(request, error) : null);
    }
    catch {
      finishSheet(null);
    }
  };

  return (
    <SafeAreaProvider>
      <ContainerProvider container={container}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary
            fallback={fallbackErrorBoundary}
            onError={handleError}
          >
            <InjectSheetScreen requestUrl={requestUrl} />
          </ErrorBoundary>
        </QueryClientProvider>
      </ContainerProvider>
    </SafeAreaProvider>
  );
};

// Boot runs on its own client so clearing the data cache never rebuilds the container.
const InjectSheetApp = (props: InjectSheetAppProps): ReactElement => {
  const [bootQueryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={bootQueryClient}>
      <InjectSheetRoot {...props} />
    </QueryClientProvider>
  );
};

export default InjectSheetApp;
