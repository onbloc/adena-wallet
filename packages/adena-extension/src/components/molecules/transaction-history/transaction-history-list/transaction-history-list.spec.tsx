import {
  GlobalPopupStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';

import TransactionHistoryList, {
  TransactionHistoryListProps,
} from './transaction-history-list';

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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransactionHistoryList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
