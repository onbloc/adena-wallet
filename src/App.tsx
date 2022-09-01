import React from 'react';
import { ThemeProvider } from 'styled-components';
import theme from '@styles/theme';
import { CustomRouter } from '@router/CustomRouter';
import { GlobalStyle } from '@styles/GlobalStyle';
import { SdkProvider } from './services';
import { config } from './services';

const App = () => {
  return (
    <>
      <GlobalStyle />
      <ThemeProvider theme={theme}>
        <SdkProvider config={config}>
          <CustomRouter />
        </SdkProvider>
      </ThemeProvider>
    </>
  );
};

export default App;
