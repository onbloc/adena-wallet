import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebMain } from '.';

describe('WebMain Component', () => {
  it('WebMain render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebMain >Web Main</WebMain>
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});