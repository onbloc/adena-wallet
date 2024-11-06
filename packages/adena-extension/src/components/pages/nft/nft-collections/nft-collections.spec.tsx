import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTCollections, { NFTCollectionsProps } from './nft-collections';

describe('NFTCollections Component', () => {
  it('NFTCollections render', () => {
    const args: NFTCollectionsProps = {
      collections: [],
      isFetchedCollections: true,
      pinnedCollections: [],
      isFetchedPinnedCollections: true,
      pin: async () => {
        return;
      },
      unpin: async () => {
        return;
      },
      moveCollectionPage: () => {
        return;
      },
      moveManageCollectionsPage: () => {
        return;
      },
      queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
      queryGRC721Balance: () => ({}) as unknown as UseQueryResult<number | null>,
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCollections {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
