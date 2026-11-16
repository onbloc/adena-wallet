import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { WebSecurityHeader } from '.';

describe('WebSecurityHeader Component', () => {
  it('WebSecurityHeader render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebSecurityHeader
            currentStep={0}
            stepLength={2}
            visibleBackButton={true}
            onClickGoBack={(): void => { return; }}
          />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
