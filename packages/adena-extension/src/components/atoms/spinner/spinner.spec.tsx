import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { Spinner, SpinnerProps } from '.';

describe('Spinner Component', () => {
  it('Spinner render', () => {
    const args: SpinnerProps = {};

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <Spinner {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
