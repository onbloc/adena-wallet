import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferLedgerLoading {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
