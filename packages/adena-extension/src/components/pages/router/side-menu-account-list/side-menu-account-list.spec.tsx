import {
  describe, it,
} from 'vitest';
import {
  GlobalPopupStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import {
  SideMenuAccountListProps,
} from '@types';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';

import SideMenuAccountList from './side-menu-account-list';

describe('SideMenuAccountList Component', () => {
  it('SideMenuAccountList render', () => {
    const args: SideMenuAccountListProps = {
      currentAccountId: '',
      accounts: [],
      focusedAccountId: '',
      focusAccountId: () => {
        return;
      },
      changeAccount: () => {
        return;
      },
      moveGnoscan: () => {
        return;
      },
      moveAccountDetail: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SideMenuAccountList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
