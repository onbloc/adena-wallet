import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTAssetImageCard, { NFTAssetImageCardProps } from './nft-asset-image-card';

describe('NFTAssetImageCard Component', () => {
  it('NFTAssetImageCard render', () => {
    const args: NFTAssetImageCardProps = {
      asset: {
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
      queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTAssetImageCard {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
