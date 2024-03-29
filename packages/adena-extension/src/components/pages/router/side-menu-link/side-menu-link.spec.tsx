import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import SideMenuLink, { SideMenuLinkProps } from './side-menu-link';

describe('SideMenuLink Component', () => {
  it('SideMenuLink render', () => {
    const args: SideMenuLinkProps = {
      text: '',
      icon: '',
      onClick: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SideMenuLink {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
