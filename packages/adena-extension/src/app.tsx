import React, { Suspense } from 'react';
import { ThemeProvider } from 'styled-components';
import theme from '@styles/theme';
import { CustomRouter } from '@router/custom-router';
import { GlobalStyle } from '@styles/global-style';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Background } from '@components/background';

const queryClient = new QueryClient();

const App = () => {
  return (
    <>
      <GlobalStyle />
      <RecoilRoot>
        <Suspense fallback={<div>Loading...</div>}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <Background>
                <CustomRouter />
              </Background>
            </ThemeProvider>
          </QueryClientProvider>
        </Suspense>
      </RecoilRoot>
    </>
  );
};

export default App;
