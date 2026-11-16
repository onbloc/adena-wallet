import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import MainManageTokenButton, { MainManageTokenButtonProps } from './main-manage-token-button';

describe('MainManageTokenButton Component', () => {
  it('MainManageTokenButton render', () => {
    const args: MainManageTokenButtonProps = {
      onClick: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <MainManageTokenButton {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
