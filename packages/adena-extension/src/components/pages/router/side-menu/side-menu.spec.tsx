import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { SideMenuProps } from '@types';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SideMenu {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
