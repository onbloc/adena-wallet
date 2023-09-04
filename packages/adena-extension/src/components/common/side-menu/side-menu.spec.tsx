import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import SideMenu, { SideMenuProps } from './side-menu';

describe('SideMenu Component', () => {
  it('SideMenu render', () => {
    const args: SideMenuProps = {
      accounts: [],
      changeAccount: () => { return; },
      openLink: () => { return; },
      movePage: () => { return; },
      lock: () => { return; },
      close: () => { return; },
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