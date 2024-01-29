import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import NetworkListItem, { NetworkListItemProps } from './network-list-item';

describe('NetworkListItem Component', () => {
  it('NetworkListItem render', () => {
    const args: NetworkListItemProps = {
      selected: true,
      locked: true,
      networkMetainfo: {
        id: 'test3',
        default: true,
        main: true,
        chainId: 'GNOLAND',
        chainName: 'GNO.LAND',
        networkId: 'test3',
        networkName: 'Testnet 3',
        addressPrefix: 'g',
        rpcUrl: 'https://rpc.test3.gno.land',
        gnoUrl: 'https://test3.gno.land',
        apiUrl: 'https://api.adena.app',
        linkUrl: 'https://gnoscan.io',
      },
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
