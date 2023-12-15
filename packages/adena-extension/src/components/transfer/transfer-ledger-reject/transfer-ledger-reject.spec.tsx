import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TransferLedgerReject, { TransferLedgerRejectProps } from './transfer-ledger-reject';

describe('TransferLedgerReject Component', () => {
  it('TransferLedgerReject render', () => {
    const args: TransferLedgerRejectProps = {
      onClickClose: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TransferLedgerReject {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});