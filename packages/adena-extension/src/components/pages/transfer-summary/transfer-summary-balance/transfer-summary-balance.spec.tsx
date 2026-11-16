import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TransferSummaryBalance, { TransferSummaryBalanceProps } from './transfer-summary-balance';

describe('TransferSummaryBalance Component', () => {
  it('TransferSummaryBalance render', () => {
    const args: TransferSummaryBalanceProps = {
      tokenImage: '',
      value: '',
      denom: '',
      tokenName: 'Gno.land',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferSummaryBalance {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
