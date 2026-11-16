import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
