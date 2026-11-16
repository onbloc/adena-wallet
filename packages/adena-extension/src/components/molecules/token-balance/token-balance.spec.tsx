import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { TokenBalance, TokenBalanceProps } from '.';

describe('TokenBalance Component', () => {
  it('TokenBalance render', () => {
    const args: TokenBalanceProps = {
      value: '123,456,789,123465',
      denom: 'GNOT',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenBalance {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });

  it('TokenBalance empty value', () => {
    const args: TokenBalanceProps = {
      value: '',
      denom: '',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenBalance {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
