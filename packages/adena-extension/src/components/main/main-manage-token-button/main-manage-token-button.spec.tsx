import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import MainManageTokenButton, { MainManageTokenButtonProps } from './main-manage-token-button';

describe('MainManageTokenButton Component', () => {
  it('MainManageTokenButton render', () => {
    const args: MainManageTokenButtonProps = {
      onClick: () => { return; }
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <MainManageTokenButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});