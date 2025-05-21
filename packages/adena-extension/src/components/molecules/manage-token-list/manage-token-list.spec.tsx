import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import ManageTokenList, { ManageTokenListProps } from './manage-token-list';

const tokens = [
  {
    tokenId: 'token1',
    type: 'token' as const,
    symbol: 'GNOT',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    name: 'Gno.land',
    balance: {
      value: '240,255.241155',
      denom: 'GNOT',
    },
    activated: true,
  },
  {
    tokenId: 'token2',
    type: 'token' as const,
    symbol: 'GNS',
    logo: 'https://avatars.githubusercontent.com/u/118414737?s=200&v=4',
    name: 'GnoSwap',
    balance: {
      value: '252.844',
      denom: 'GNS',
    },
    activated: true,
  },
];

describe('ManageTokenList Component', () => {
  it('ManageTokenList render', () => {
    const args: ManageTokenListProps = {
      tokens,
      onToggleActiveItem: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageTokenList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
