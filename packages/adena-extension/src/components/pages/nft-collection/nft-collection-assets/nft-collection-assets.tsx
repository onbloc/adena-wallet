import { Text } from '@components/atoms';
import { LoadingNft } from '@components/molecules';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721Model } from '@types';
import React, { useMemo } from 'react';
import { useTheme } from 'styled-components';
import NFTCollectionAssetCard from '../nft-collection-asset-card/nft-collection-asset-card';
import { NFTCollectionAssetsWrapper } from './nft-collection-assets.styles';

export interface NFTCollectionAssetsProps {
  tokens: GRC721Model[] | null | undefined;
  isFetchedTokens: boolean;
  queryGRC721TokenUri: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  moveAssetPage: (grc721Token: GRC721Model) => void;
}

const NFTCollectionAssets: React.FC<NFTCollectionAssetsProps> = ({
  tokens,
  isFetchedTokens,
  queryGRC721TokenUri,
  moveAssetPage,
}) => {
  const theme = useTheme();

  const isLoading = useMemo(() => {
    if (!isFetchedTokens) {
      return true;
    }

    return tokens === null;
  }, [isFetchedTokens, tokens]);

  const isEmptyAssets = useMemo(() => {
    return tokens?.length === 0;
  }, [tokens]);

  if (isEmptyAssets) {
    return (
      <NFTCollectionAssetsWrapper>
        <Text className='description' type='body1Reg' color={theme.neutral.a}>
          No NFTs to display
        </Text>
      </NFTCollectionAssetsWrapper>
    );
  }

  return (
    <NFTCollectionAssetsWrapper>
      {tokens?.map((token, index) => (
        <NFTCollectionAssetCard
          key={index}
          grc721Token={token}
          queryGRC721TokenUri={queryGRC721TokenUri}
          moveAssetPage={moveAssetPage}
        />
      ))}

      {isLoading && (
        <div className='loading-wrapper'>
          <LoadingNft />
        </div>
      )}
    </NFTCollectionAssetsWrapper>
  );
};

export default NFTCollectionAssets;
