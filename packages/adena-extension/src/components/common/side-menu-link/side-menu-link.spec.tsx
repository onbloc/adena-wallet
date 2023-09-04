import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import SideMenuLink, { SideMenuLinkProps } from './side-menu-link';

describe('SideMenuLink Component', () => {
  it('SideMenuLink render', () => {
    const args: SideMenuLinkProps = {
      text: '',
      icon: '',
      onClick: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <SideMenuLink {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});