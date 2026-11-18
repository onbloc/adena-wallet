import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SideMenuLink {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
