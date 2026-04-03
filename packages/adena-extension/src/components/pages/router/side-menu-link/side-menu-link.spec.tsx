import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

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
