import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import ManageTokenSearch, { ManageTokenSearchProps } from '.';

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
    symbol: 'GNOS',
    logo: 'https://avatars.githubusercontent.com/u/118414737?s=200&v=4',
    name: 'GnoSwap',
    balance: {
      value: '252.844',
      denom: 'GNOS',
    },
    activated: true,
  },
];

describe('ManageTokenSearch Component', () => {
  it('ManageTokenSearch render', () => {
    const args: ManageTokenSearchProps = {
      tokens,
      keyword: '',
      onChangeKeyword: () => {
        return;
      },
      onClickAdded: () => {
        return;
      },
      onClickClose: () => {
        return;
      },
      onToggleActiveItem: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageTokenSearch {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
