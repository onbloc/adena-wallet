import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TransferSummary, { TransferSummaryProps } from './transfer-summary';

describe('TransferSummary Component', () => {
  it('TransferSummary render', () => {
    const args: TransferSummaryProps = {
      tokenImage: '',
      transferBalance: '',
      toAddress: '',
      networkFee: {
        value: '0.0048',
        denom: 'GNOT'
      },
      onClickCancel: () => { return; },
      onClickSend: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TransferSummary {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});