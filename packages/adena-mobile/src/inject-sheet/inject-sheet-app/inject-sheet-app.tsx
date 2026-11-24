import { QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../../app/error-boundary';
import { InjectSheetPage } from '../../components/pages';
import { ContainerProvider } from '../../di/container-provider';
import NativeAdenaInjectSheet from '../../native/NativeAdenaInjectSheet';
import { useNativeContainerQuery } from '../../queries/boot.queries';
import { createQueryClient } from '../../queries/query-client';
import { createSheetSession, finishSheet, InjectSheetScreen } from '../inject-sheet-screen';

// Launch options from InjectSheetActivity.
export interface InjectSheetAppProps {
  requestUrl?: string;
  sheetToken?: string;
  callerPackage?: string;
}

// Separate root for the Android overlay. It owns its own container, so its keyring
// session is independent of (and never unlocked by) the main wallet UI.
const InjectSheetRoot = ({ requestUrl, sheetToken, callerPackage }: InjectSheetAppProps): ReactElement | null => {
  const boot = useNativeContainerQuery();
  const container = boot.data ?? null;
  const bootError = boot.isError ? String((boot.error as Error)?.message ?? boot.error) : undefined;
  const [queryClient] = useState(createQueryClient);
  const [session] = useState(() => createSheetSession(sheetToken));

  // Back press: the mounted screen answers the dApp; before boot there is nobody to answer yet.
  useEffect(() => {
    const subscription = NativeAdenaInjectSheet?.onDismissRequest?.((token) => {
      if (token !== session.token) {
        return;
      }

      if (session.onDismissRequest) {
        session.onDismissRequest();
      }
      else {
        finishSheet(session.token, null);
      }
    });

    return (): void => subscription?.remove();
  }, [session]);

  // The window is transparent, so a failed boot must still render something the user can close.
  const handleApprove = (): void => undefined;

  const handleReject = (): void => finishSheet(session.token, null);

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

  // A crash's message is internal, so the dApp only gets a generic failure.
  const handleError = (): void => {
    if (session.inFlight || session.done) {
      return;
    }

    session.done = true;

    try {
      const request = requestUrl ? container.dappService.parseRequestUrl(requestUrl, callerPackage) : null;

      finishSheet(session.token, request ? container.dappService.failUnexpected(request) : null);
    }
    catch {
      finishSheet(session.token, null);
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
            <InjectSheetScreen requestUrl={requestUrl} callerPackage={callerPackage} session={session} />
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
