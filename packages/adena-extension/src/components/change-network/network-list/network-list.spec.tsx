import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import NetworkList, { NetworkListProps } from './network-list';

describe('NetworkList Component', () => {
  it('NetworkList render', () => {
    const args: NetworkListProps = {
      currentNetworkId: "test3",
      networkMetainfos: [],
      changeNetwork: () => { return; },
      moveEditPage: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <NetworkList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});