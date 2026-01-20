import React, { ReactElement, ReactNode, Suspense } from 'react';

import { ThemeProvider } from 'styled-components';
import theme from '@styles/theme';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdenaProvider, MultisigTransactionProvider, WalletProvider } from '@common/provider';
import { AppProviderErrorBoundary, AppReloadFallback } from '@common/error-boundary';

const queryClient = new QueryClient();

const AppProvider = ({ children }: { children: ReactNode }): ReactElement => {
  return (
    <React.Fragment>
      <AppProviderErrorBoundary fallback={<AppReloadFallback />}>
        <RecoilRoot>
          <QueryClientProvider client={queryClient}>
            <AdenaProvider>
              <WalletProvider>
                <MultisigTransactionProvider>
                  <ThemeProvider theme={theme}>
                    <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
                  </ThemeProvider>
                </MultisigTransactionProvider>
              </WalletProvider>
            </AdenaProvider>
          </QueryClientProvider>
        </RecoilRoot>
      </AppProviderErrorBoundary>
    </React.Fragment>
  );
};

export default AppProvider;
