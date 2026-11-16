import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
