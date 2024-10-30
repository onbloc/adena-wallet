import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTCollectionAssetCard, { NFTCollectionAssetCardProps } from './nft-collection-asset-card';

describe('NFTCollectionAssetCard Component', () => {
  it('NFTCollectionAssetCard render', () => {
    const args: NFTCollectionAssetCardProps = {
      grc721Token: {
        metadata: null,
        name: '',
        networkId: '',
        packagePath: '',
        symbol: '',
        tokenId: '',
        type: 'grc721',
        isMetadata: true,
        isTokenUri: true,
      },
      moveAssetPage: () => {
        return;
      },
      queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCollectionAssetCard {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
