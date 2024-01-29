import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import { TokenBalance, TokenBalanceProps } from '.';

describe('TokenBalance Component', () => {
  it('TokenBalance render', () => {
    const args: TokenBalanceProps = {
      value: '123,456,789,123465',
      denom: 'GNOT',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });

  it('TokenBalance empty value', () => {
    const args: TokenBalanceProps = {
      value: '',
      denom: '',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
