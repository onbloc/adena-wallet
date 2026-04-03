import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import { TokenBalance, TokenBalanceProps } from '.';

describe('TokenBalance Component', () => {
  it('TokenBalance render', () => {
    const args: TokenBalanceProps = {
      value: '123,456,789,123465',
      denom: 'GNOT'
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });

  it('TokenBalance empty value', () => {
    const args: TokenBalanceProps = {
      value: '',
      denom: ''
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
