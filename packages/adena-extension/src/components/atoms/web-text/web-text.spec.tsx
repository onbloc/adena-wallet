import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { WebText } from '.';

describe('WebText Component', () => {
  it('WebText render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebText
            type='title1'
            color='#000000'
            style={{}}
            textCenter
          >
            WebText
          </WebText>
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
