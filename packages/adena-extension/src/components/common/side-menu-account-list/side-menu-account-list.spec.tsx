import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import SideMenuAccountList, { SideMenuAccountListProps } from './side-menu-account-list';

describe('SideMenuAccountList Component', () => {
  it('SideMenuAccountList render', () => {
    const args: SideMenuAccountListProps = {
      accounts: [],
      changeAccount: () => { return; },
      moveGnoscan: () => { return; },
      moveAccountDetail: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <SideMenuAccountList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});