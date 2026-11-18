import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { ApproveLoading, ApproveLoadingProps } from '.';

describe('ApproveLoading Component', () => {
  it('ApproveLoading render', () => {
    const args: ApproveLoadingProps = {};

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveLoading {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
