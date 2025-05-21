import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import TokenList, { TokenListProps } from './token-list';

const tokens = [
  {
    tokenId: 'token1',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    name: 'Gno.land',
    balanceAmount: {
      value: '240,255.241155',
      denom: 'GNOT',
    },
  },
  {
    tokenId: 'token2',
    logo: 'https://avatars.githubusercontent.com/u/118414737?s=200&v=4',
    name: 'GnoSwap',
    balanceAmount: {
      value: '252.844',
      denom: 'GNOS',
    },
  },
];

describe('TokenList Component', () => {
  it('TokenList render', () => {
    const args: TokenListProps = {
      tokens,
      completeImageLoading: () => {
        return;
      },
      onClickTokenItem: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
