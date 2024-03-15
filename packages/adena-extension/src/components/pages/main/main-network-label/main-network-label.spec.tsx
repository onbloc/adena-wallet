import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import MainNetworkLabel, { MainNetworkLabelProps } from './main-network-label';
import { GlobalPopupStyle } from '@styles/global-style';

describe('MainNetworkLabel Component', () => {
  it('MainNetworkLabel render', () => {
    const args: MainNetworkLabelProps = {
      networkName: 'Network',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <MainNetworkLabel {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
