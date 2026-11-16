import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import { ApproveTransactionLoading, ApproveTransactionLoadingProps } from '.';

describe('ApproveTransactionLoading Component', () => {
  it('ApproveTransactionLoading render', () => {
    const args: ApproveTransactionLoadingProps = {};

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveTransactionLoading {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
