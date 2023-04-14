import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import MainTokenListItem, { MainTokenListItemProps } from './main-token-list-item';

const token = {
  tokenId: 'token1',
  logo: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
  name: 'Gnoland',
  balanceAmount: {
    value: '240,255.241155',
    denom: 'GNOT',
  }
};

describe('MainTokenListItem Component', () => {
  it('MainTokenListItem render', () => {
    const args: MainTokenListItemProps = {
      token,
      onClickTokenItem: () => { return; }
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <MainTokenListItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});