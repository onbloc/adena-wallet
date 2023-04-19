import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import TokenList, { TokenListProps } from './token-list';

const tokens = [
  {
    tokenId: "token1",
    logo: "https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg",
    name: "Gnoland",
    balanceAmount: {
      value: "240,255.241155",
      denom: "GNOT",
    },
  }, {
    tokenId: "token2",
    logo: "https://avatars.githubusercontent.com/u/118414737?s=200&v=4",
    name: "Gnoswap",
    balanceAmount: {
      value: "252.844",
      denom: "GNOS",
    }
  }
];

describe('TokenList Component', () => {
  it('TokenList render', () => {
    const args: TokenListProps = {
      tokens,
      onClickTokenItem: () => { return; }
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <TokenList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});