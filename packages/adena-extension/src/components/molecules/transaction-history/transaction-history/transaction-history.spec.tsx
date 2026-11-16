import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { TransactionHistory, TransactionHistoryProps } from '.';

describe('TransactionHistory Component', () => {
  it('TransactionHistory render', () => {
    const args: TransactionHistoryProps = {
      status: 'success',
      transactionInfoLists: [],
      onClickItem: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransactionHistory {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
