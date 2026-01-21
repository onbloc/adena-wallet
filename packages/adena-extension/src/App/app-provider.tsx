import React, { ReactElement, ReactNode, Suspense } from 'react';

import { AppProviderErrorBoundary, AppReloadFallback } from '@common/error-boundary';
import { AdenaProvider, WalletProvider } from '@common/provider';
import theme from '@styles/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

const queryClient = new QueryClient();

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
