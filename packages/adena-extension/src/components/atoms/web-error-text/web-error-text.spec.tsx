import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalWebStyle } from '@styles/global-style';
import { WebErrorText } from '.';

describe('WebErrorText Component', () => {
  it('WebErrorText render', () => {

    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebErrorText text='WebErrorText' />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});