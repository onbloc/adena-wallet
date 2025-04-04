import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import { ApproveTransactionLoading, ApproveTransactionLoadingProps } from '.';

describe('ApproveTransactionLoading Component', () => {
  it('ApproveTransactionLoading render', () => {
    const args: ApproveTransactionLoadingProps = {};

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveTransactionLoading {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
