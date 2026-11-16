import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
