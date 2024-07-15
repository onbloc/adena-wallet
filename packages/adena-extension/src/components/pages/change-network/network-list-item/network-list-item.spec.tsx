import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import NetworkListItem, { NetworkListItemProps } from './network-list-item';
import CHAIN_DATA from '@resources/chains/chains.json';

describe('NetworkListItem Component', () => {
  it('NetworkListItem render', () => {
    const args: NetworkListItemProps = {
      selected: true,
      locked: true,
      networkMetainfo: CHAIN_DATA[0],
      moveEditPage: () => {
        return;
      },
      changeNetwork: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NetworkListItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
