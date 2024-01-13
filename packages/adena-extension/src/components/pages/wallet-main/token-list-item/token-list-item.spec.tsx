import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TokenListItem, { TokenListItemProps } from './token-list-item';

const token = {
  tokenId: 'token1',
  logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
  name: 'Gnoland',
  balanceAmount: {
    value: '240,255.241155',
    denom: 'GNOT',
  },
};

describe('TokenListItem Component', () => {
  it('TokenListItem render', () => {
    const args: TokenListItemProps = {
      token,
      onClickTokenItem: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenListItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
