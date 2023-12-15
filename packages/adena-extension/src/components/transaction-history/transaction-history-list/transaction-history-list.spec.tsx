import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TransactionHistoryList, { TransactionHistoryListProps } from './transaction-history-list';

describe('TransactionHistoryList Component', () => {
  it('TransactionHistoryList render', () => {
    const args: TransactionHistoryListProps = {
      title: '',
      transactions: [],
      onClickItem: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TransactionHistoryList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});