import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import SideMenuAccountItem from './side-menu-account-item';
import { SideMenuAccountItemProps } from '@types';

describe('SideMenuAccountItem Component', () => {
  it('SideMenuAccountItem render', () => {
    const args: SideMenuAccountItemProps = {
      selected: false,
      account: {
        accountId: '',
        name: '',
        address: '',
        balance: '',
        type: 'HD_WALLET',
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
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <SideMenuAccountItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
