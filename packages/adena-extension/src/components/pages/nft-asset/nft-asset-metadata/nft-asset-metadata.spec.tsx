import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { GRC721MetadataModel } from '@types';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTAssetMetadata, { NFTAssetMetadataProps } from './nft-asset-metadata';

describe('NFTAssetMetadata Component', () => {
  it('NFTAssetMetadata render', () => {
    const args: NFTAssetMetadataProps = {
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
      queryGRC721TokenMetadata: () => ({}) as unknown as UseQueryResult<GRC721MetadataModel | null>,
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTAssetMetadata {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
