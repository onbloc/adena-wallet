import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import ApproveLedgerLoading, { ApproveLedgerLoadingProps } from './approve-ledger-loading';

describe('ApproveLedgerLoading Component', () => {
  it('ApproveLedgerLoading render', () => {
    const args: ApproveLedgerLoadingProps = {
      onClickCancel: () => { return; }
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <ApproveLedgerLoading {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});