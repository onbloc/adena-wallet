import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebTextarea } from '.';

describe('WebTextarea Component', () => {
  it('WebTextarea render', () => {

    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebTextarea />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});