import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import MainNetworkLabel, { MainNetworkLabelProps } from './main-network-label';

describe('MainNetworkLabel Component', () => {
  it('MainNetworkLabel render', () => {
    const args: MainNetworkLabelProps = {
      networkName: 'Network',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <MainNetworkLabel {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
