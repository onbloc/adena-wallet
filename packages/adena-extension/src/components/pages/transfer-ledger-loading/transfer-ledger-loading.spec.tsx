import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TransferLedgerLoading, { TransferLedgerLoadingProps } from './transfer-ledger-loading';

describe('TransferLedgerLoading Component', () => {
  it('TransferLedgerLoading render', () => {
    const args: TransferLedgerLoadingProps = {
      onClickCancel: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TransferLedgerLoading {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});