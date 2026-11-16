import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import NFTCollectionAssets, { NFTCollectionAssetsProps } from './nft-collection-assets';

describe('NFTCollectionAssets Component', () => {
  it('NFTCollectionAssets render', () => {
    const args: NFTCollectionAssetsProps = {
      tokens: [],
      isFetchedTokens: true,
      moveAssetPage: () => {
        return;
      },
      queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCollectionAssets {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
