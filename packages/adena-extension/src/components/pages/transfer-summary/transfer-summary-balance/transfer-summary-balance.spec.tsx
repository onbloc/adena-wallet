import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TransferSummaryBalance, { TransferSummaryBalanceProps } from './transfer-summary-balance';

describe('TransferSummaryBalance Component', () => {
  it('TransferSummaryBalance render', () => {
    const args: TransferSummaryBalanceProps = {
      tokenImage: '',
      value: '',
      denom: '',
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TransferSummaryBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});