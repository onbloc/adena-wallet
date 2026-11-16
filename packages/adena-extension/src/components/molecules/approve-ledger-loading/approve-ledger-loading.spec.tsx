import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveLedgerLoading {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
