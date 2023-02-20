import React, { Suspense } from 'react';
import { ThemeProvider } from 'styled-components';
import theme from '@styles/theme';
import { CustomRouter } from '@router/custom-router';
import { GlobalStyle } from '@styles/global-style';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdenaProvider } from '@common/provider';

const queryClient = new QueryClient();

const App = () => {
  return (
    <>
      <GlobalStyle />
      <RecoilRoot>
        <Suspense fallback={<div>Loading...</div>}>
          <AdenaProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider theme={theme}>
                <CustomRouter />
              </ThemeProvider>
            </QueryClientProvider>
          </AdenaProvider>
        </Suspense>
      </RecoilRoot>
    </>
  );
};

export default App;
