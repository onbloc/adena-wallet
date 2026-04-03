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
  SideMenuProps,
} from '@types';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';

import SideMenu from './side-menu';

describe('SideMenu Component', () => {
  it('SideMenu render', () => {
    const args: SideMenuProps = {
      scannerQueryString: '',
      scannerUrl: '',
      locked: false,
      currentAccountId: null,
      accounts: [],
      focusedAccountId: '',
      focusAccountId: () => {
        return;
      },
      changeAccount: () => {
        return;
      },
      openLink: () => {
        return;
      },
      openRegister: () => {
        return;
      },
      movePage: () => {
        return;
      },
      lock: () => {
        return;
      },
      close: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SideMenu {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
