import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TransactionHistoryListItem, {
  TransactionHistoryListItemProps,
} from './transaction-history-list-item';

describe('TransactionHistoryListItem Component', () => {
  it('TransactionHistoryListItem render', () => {
    const args: TransactionHistoryListItemProps = {
      hash: 'hash1',
      logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
      type: 'TRANSFER',
      status: 'SUCCESS',
      title: 'Send',
      description: 'To: g1n5...123n',
      extraInfo: '',
      amount: {
        value: '-4,000',
        denom: 'GNOT',
      },
      valueType: 'DEFAULT',
      onClickItem: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransactionHistoryListItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
