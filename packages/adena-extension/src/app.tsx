import React, { ReactElement, Suspense } from 'react';
import { ThemeProvider } from 'styled-components';
import theme from '@styles/theme';
import { CustomRouter } from '@router/custom-router';
import { GlobalStyle } from '@styles/global-style';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdenaProvider, WalletProvider } from '@common/provider';

const queryClient = new QueryClient();

const App = (): ReactElement => {
  return (
    <>
      <GlobalStyle />
      <RecoilRoot>
        <QueryClientProvider client={queryClient}>
          <AdenaProvider>
            <WalletProvider>
              <ThemeProvider theme={theme}>
                <Suspense fallback={<div>Loading...</div>}>
                  <CustomRouter />
                </Suspense>
              </ThemeProvider>
            </WalletProvider>
          </AdenaProvider>
        </QueryClientProvider>
      </RecoilRoot>
    </>
  );
};

export default App;
