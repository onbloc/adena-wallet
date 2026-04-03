import {
  GlobalPopupStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';

import MainManageTokenButton, {
  MainManageTokenButtonProps,
} from './main-manage-token-button';

describe('MainManageTokenButton Component', () => {
  it('MainManageTokenButton render', () => {
    const args: MainManageTokenButtonProps = {
      onClick: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <MainManageTokenButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
