import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { WebButton } from '.';

describe('WebButton Component', () => {
  it('WebButton render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebButton
            figure='primary'
            size='small'
            text='WebButton'
          />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
