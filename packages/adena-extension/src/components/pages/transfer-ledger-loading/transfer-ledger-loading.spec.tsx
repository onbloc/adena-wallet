import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import TransferLedgerLoading, { TransferLedgerLoadingProps } from './transfer-ledger-loading';

describe('TransferLedgerLoading Component', () => {
  it('TransferLedgerLoading render', () => {
    const args: TransferLedgerLoadingProps = {
      document: null,
      onClickCancel: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferLedgerLoading {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
