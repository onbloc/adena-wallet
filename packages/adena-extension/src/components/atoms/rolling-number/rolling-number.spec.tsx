import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import RollingNumber from '.';

describe('RollingNumber Component', () => {
  it('RollingNumber render', () => {
    render(
      <JotaiProvider>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <RollingNumber
            type='body1'
            value={1}
          />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
