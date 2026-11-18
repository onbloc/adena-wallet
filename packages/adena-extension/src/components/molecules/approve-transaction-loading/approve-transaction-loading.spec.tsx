import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
