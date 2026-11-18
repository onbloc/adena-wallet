import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
