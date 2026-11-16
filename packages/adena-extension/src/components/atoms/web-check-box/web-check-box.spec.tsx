import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { WebCheckBox } from '.';

describe('WebCheckBox Component', () => {
  it('WebCheckBox render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebCheckBox checked />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
