import React from 'react';

import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import TransferSummaryNetworkFee, {
  TransferSummaryNetworkFeeProps,
} from './transfer-summary-network-fee';

describe('TransferSummaryNetworkFee Component', () => {
  it('TransferSummaryNetworkFee render', () => {
    const args: TransferSummaryNetworkFeeProps = {
      value: '0.0048',
      denom: 'GNOT',
      isError: false,
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferSummaryNetworkFee {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
