import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTCollectionCard, { NFTCollectionCardProps } from './nft-collection-card';

describe('NFTCollectionCard Component', () => {
  it('NFTCollectionCard render', () => {
    const args: NFTCollectionCardProps = {
      grc721Collection: {
        display: false,
        name: '',
        networkId: '',
        packagePath: '',
        symbol: '',
        tokenId: '',
        type: 'grc721',
        isMetadata: true,
        isTokenUri: true,
      },
      pin: () => {
        return;
      },
      unpin: () => {
        return;
      },
      moveCollectionPage: () => {
        return;
      },
      queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
      queryGRC721Balance: () => ({}) as unknown as UseQueryResult<number | null>,
      pinned: false,
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCollectionCard {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
