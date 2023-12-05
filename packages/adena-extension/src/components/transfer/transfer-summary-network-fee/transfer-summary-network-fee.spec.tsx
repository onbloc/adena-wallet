import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TransferSummaryNetworkFee, { TransferSummaryNetworkFeeProps } from './transfer-summary-network-fee';

describe('TransferSummaryNetworkFee Component', () => {
  it('TransferSummaryNetworkFee render', () => {
    const args: TransferSummaryNetworkFeeProps = {
      value: '0.0048',
      denom: 'GNOT',
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TransferSummaryNetworkFee {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});