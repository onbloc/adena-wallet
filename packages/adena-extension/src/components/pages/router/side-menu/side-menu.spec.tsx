import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import SideMenu from './side-menu';
import { SideMenuProps } from '@types';

describe('SideMenu Component', () => {
  it('SideMenu render', () => {
    const args: SideMenuProps = {
      locked: false,
      currentAccountId: null,
      accounts: [],
      changeAccount: () => {
        return;
      },
      openLink: () => {
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
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <SideMenu {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
