import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { WebImg } from '.';

describe('WebImg Component', () => {
  it('WebImg render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebImg src='https://adena.app/assets/images/favicon.svg' />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
