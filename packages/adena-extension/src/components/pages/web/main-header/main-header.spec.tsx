import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { WebMainHeader } from '.';

describe('MainHeader Component', () => {
  it('MainHeader render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebMainHeader
            currentStep={1}
            stepLength={4}
            onClickGoBack={(): void => { return; }}
          />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
