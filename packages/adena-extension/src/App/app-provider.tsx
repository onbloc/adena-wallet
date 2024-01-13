import React, { ReactElement, ReactNode, Suspense } from 'react';
import { HashRouter } from 'react-router-dom';

import { ThemeProvider } from 'styled-components';
import theme from '@styles/theme';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdenaProvider, WalletProvider } from '@common/provider';

const queryClient = new QueryClient();

const AppProvider = ({ children }: { children: ReactNode }): ReactElement => {
  return (
    <>
      <RecoilRoot>
        <QueryClientProvider client={queryClient}>
          <AdenaProvider>
            <WalletProvider>
              <ThemeProvider theme={theme}>
                <Suspense fallback={<div>Loading...</div>}>
                  <HashRouter>{children}</HashRouter>
                </Suspense>
              </ThemeProvider>
            </WalletProvider>
          </AdenaProvider>
        </QueryClientProvider>
      </RecoilRoot>
    </>
  );
};

export default AppProvider;
