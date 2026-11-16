import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TransferSummaryAddress, { TransferSummaryAddressProps } from './transfer-summary-address';

describe('TransferSummaryAddress Component', () => {
  it('TransferSummaryAddress render', () => {
    const args: TransferSummaryAddressProps = {
      toAddress: '',
      network: 'Gno.land',
      memo: '',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferSummaryAddress {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
