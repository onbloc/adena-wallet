import React from 'react';

import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTAssetImageCard, { NFTAssetImageCardProps } from './nft-asset-image-card';

const makeAsset = (
  overrides?: Partial<NFTAssetImageCardProps['asset']>,
): NFTAssetImageCardProps['asset'] => ({
  metadata: null,
  name: '',
  networkId: '',
  packagePath: 'gno.land/r/gnoswap/gnft',
  symbol: '',
  tokenId: '1',
  type: 'grc721',
  isMetadata: true,
  isTokenUri: true,
  ...overrides,
});

const makeQuery =
  (result: Partial<UseQueryResult<string | null>>): NFTAssetImageCardProps['queryGRC721TokenUri'] =>
  (): UseQueryResult<string | null> =>
    ({ data: null, isFetched: false, ...result }) as UseQueryResult<string | null>;

const renderCard = (props: NFTAssetImageCardProps): void => {
  render(
    <RecoilRoot>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <NFTAssetImageCard {...props} />
      </ThemeProvider>
    </RecoilRoot>,
  );
};

describe('NFTAssetImageCard Component', () => {
  it('NFTAssetImageCard render', () => {
    renderCard({
      asset: makeAsset(),
      queryGRC721TokenUri: makeQuery({}),
    });
  });

  it('renders the token uri image once the query resolves', () => {
    renderCard({
      asset: makeAsset(),
      queryGRC721TokenUri: makeQuery({
        data: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        isFetched: true,
      }),
    });

    expect(screen.getByAltText('nft image').getAttribute('src')).toBe(
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    );
  });

  // The query is disabled for a realm without `TokenURI`, so it never reports
  // `isFetched` — the card must not wait on it forever.
  it('falls back to the empty image when the realm publishes no token uri', () => {
    renderCard({
      asset: makeAsset({ isTokenUri: false }),
      queryGRC721TokenUri: makeQuery({}),
    });

    expect(screen.getByAltText('empty image')).toBeTruthy();
  });

  it('falls back to the empty image when the asset carries no token id', () => {
    renderCard({
      asset: makeAsset({ tokenId: '' }),
      queryGRC721TokenUri: makeQuery({}),
    });

    expect(screen.getByAltText('empty image')).toBeTruthy();
  });
});
