import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import { ApproveLedgerLoading, ApproveLedgerLoadingProps } from '.';

describe('ApproveLedgerLoading Component', () => {
  it('ApproveLedgerLoading render', () => {
    const args: ApproveLedgerLoadingProps = {
      document: null,
      onClickCancel: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveLedgerLoading {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
