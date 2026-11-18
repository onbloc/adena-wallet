import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
