import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import TransactionHistoryList, { TransactionHistoryListProps } from './transaction-history-list';

describe('TransactionHistoryList Component', () => {
  it('TransactionHistoryList render', () => {
    const args: TransactionHistoryListProps = {
      title: '',
      transactions: [],
      onClickItem: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransactionHistoryList {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
