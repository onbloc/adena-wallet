import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransactionHistory {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
