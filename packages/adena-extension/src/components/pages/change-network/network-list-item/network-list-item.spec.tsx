import {
  describe, it,
} from 'vitest';
import CHAIN_DATA from '@resources/chains/chains.json';
import {
  GlobalPopupStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';

import NetworkListItem, {
  NetworkListItemProps,
} from './network-list-item';

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
