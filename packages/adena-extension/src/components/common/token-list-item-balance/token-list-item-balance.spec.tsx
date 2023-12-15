import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TokenListItemBalance, { TokenListItemBalanceProps } from './token-list-item-balance';

describe('TokenListItemBalance Component', () => {
  it('TokenListItemBalance render', () => {
    const args: TokenListItemBalanceProps = {
      amount: {
        value: '240,255.241155',
        denom: 'GNOT',
      },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TokenListItemBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
