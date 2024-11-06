import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import SideMenuAccountList from './side-menu-account-list';
import { SideMenuAccountListProps } from '@types';

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
