import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import TransferLedgerReject, { TransferLedgerRejectProps } from './transfer-ledger-reject';

describe('TransferLedgerReject Component', () => {
  it('TransferLedgerReject render', () => {
    const args: TransferLedgerRejectProps = {
      onClickClose: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferLedgerReject {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
