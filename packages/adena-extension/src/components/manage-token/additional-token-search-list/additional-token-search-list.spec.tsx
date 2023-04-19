import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import AdditionalTokenSearchList, { AdditionalTokenSearchListProps } from './additional-token-search-list';

const tokenInfos = [
  {
    tokenId: 'token1',
    title: 'Gnoswap (GNOS)',
    description: 'gno.land/gnoswap'
  },
  {
    tokenId: 'token2',
    title: 'Gnoswim (SWIM)',
    description: 'gno.land/gnoswim'
  },
  {
    tokenId: 'token3',
    title: 'Gnosmosi.. (OSMO)',
    description: 'gno.land/gnosmo...'
  },
  {
    tokenId: 'token4',
    title: 'Gnostu.. (GNOSTU..)',
    description: 'gno.land/gnostuck'
  },
];

describe('AdditionalTokenSearchList Component', () => {
  it('AdditionalTokenSearchList render', () => {
    const args: AdditionalTokenSearchListProps = {
      tokenInfos,
      onClickListItem: () => { return; }
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenSearchList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});