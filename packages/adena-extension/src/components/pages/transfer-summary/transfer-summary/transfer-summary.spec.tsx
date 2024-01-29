import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TransferSummary, { TransferSummaryProps } from './transfer-summary';

describe('TransferSummary Component', () => {
  it('TransferSummary render', () => {
    const args: TransferSummaryProps = {
      tokenMetainfo: {
        main: true,
        tokenId: 'Gnoland',
        networkId: 'DEFAULT',
        name: 'Gnoland',
        image: '',
        symbol: 'GNOT',
        type: 'gno-native',
        decimals: 6,
        display: true,
      },
      tokenImage: '',
      transferBalance: {
        value: '4,000.123',
        denom: 'GNOT',
      },
      toAddress: '',
      networkFee: {
        value: '0.0048',
        denom: 'GNOT',
      },
      onClickBack: () => {
        return;
      },
      onClickCancel: () => {
        return;
      },
      onClickSend: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferSummary {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
