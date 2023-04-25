import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import ManageTokenSearch, { ManageTokenSearchProps } from './manage-token-search';

const tokens = [
  {
    tokenId: 'token1',
    symbol: 'GNOT',
    logo: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
    name: 'Gnoland',
    balanceAmount: {
      value: '240,255.241155',
      denom: 'GNOT',
    },
    activated: true
  }, {
    tokenId: 'token2',
    symbol: 'GNOS',
    logo: 'https://avatars.githubusercontent.com/u/118414737?s=200&v=4',
    name: 'Gnoswap',
    balanceAmount: {
      value: '252.844',
      denom: 'GNOS',
    },
    activated: true
  }
];

describe('ManageTokenSearch Component', () => {
  it('ManageTokenSearch render', () => {
    const args: ManageTokenSearchProps = {
      tokens,
      keyword: '',
      onChangeKeyword: () => { return; },
      onClickAdded: () => { return; },
      onClickClose: () => { return; },
      onToggleActiveItem: () => { return; }
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <ManageTokenSearch {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});