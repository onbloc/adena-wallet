import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TransferSummaryAddress, { TransferSummaryAddressProps } from './transfer-summary-address';

describe('TransferSummaryAddress Component', () => {
  it('TransferSummaryAddress render', () => {
    const args: TransferSummaryAddressProps = {
      toAddress: '',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferSummaryAddress {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
