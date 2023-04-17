import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import MainTokenListItemBalance, { MainTokenListItemBalanceProps } from './main-token-list-item-balance';

describe('MainTokenListItemBalance Component', () => {
  it('MainTokenListItemBalance render', () => {
    const args: MainTokenListItemBalanceProps = {
      amount: {
        value: "240,255.241155",
        denom: "GNOT"
      }
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <MainTokenListItemBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});