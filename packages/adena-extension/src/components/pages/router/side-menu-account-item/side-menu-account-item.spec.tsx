import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { SideMenuAccountItemProps } from '@types';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import SideMenuAccountItem from './side-menu-account-item';

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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SideMenuAccountItem {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
