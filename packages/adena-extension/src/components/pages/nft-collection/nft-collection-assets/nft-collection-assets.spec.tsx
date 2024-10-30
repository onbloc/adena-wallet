import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCollectionAssets {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
