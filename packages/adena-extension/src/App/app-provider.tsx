import React, { ReactElement, ReactNode, Suspense } from 'react';

import { AppProviderErrorBoundary, AppReloadFallback } from '@common/error-boundary';
import { AdenaProvider, WalletProvider } from '@common/provider';
import theme from '@styles/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

// Global query defaults. Without them every query runs with `staleTime: 0`,
// which makes each mount refetch: navigating between screens re-issues the whole
// screen's RPC set even when the data is milliseconds old. The default retry of
// 3 also triples the traffic exactly when a node is already struggling.
//
// `refetchOnMount` is deliberately left at its default (refetch when stale) so
// genuinely outdated data still refreshes; the staleTime window is what collapses
// the burst. Queries that need tighter freshness set their own staleTime or
// refetchInterval and are unaffected.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      cacheTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attempt): number => Math.min(1_000 * 2 ** attempt, 30_000),
    },
  },
});

const AppProvider = ({ children }: { children: ReactNode }): ReactElement => {
  return (
    <React.Fragment>
      <AppProviderErrorBoundary fallback={<AppReloadFallback />}>
        <RecoilRoot>
          <QueryClientProvider client={queryClient}>
            <AdenaProvider>
              <WalletProvider>
                <ThemeProvider theme={theme}>
                  <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
                </ThemeProvider>
              </WalletProvider>
            </AdenaProvider>
          </QueryClientProvider>
        </RecoilRoot>
      </AppProviderErrorBoundary>
    </React.Fragment>
  );
};

export default AppProvider;
