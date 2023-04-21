import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TransactionHistory, { TransactionHistoryProps } from './transaction-history';

describe('TransactionHistory Component', () => {
  it('TransactionHistory render', () => {
    const args: TransactionHistoryProps = {
      transactionInfoLists: []
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TransactionHistory {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});