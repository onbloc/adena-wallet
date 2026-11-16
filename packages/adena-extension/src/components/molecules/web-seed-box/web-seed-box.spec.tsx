import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebSeedBox } from '.';

describe('WebSeedBox Component', () => {
  it('WebSeedBox render', () => {

    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebSeedBox seedString='' />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});