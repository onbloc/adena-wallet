import NFTCardImage from '@components/molecules/nft-card-image/nft-card-image';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721Model } from '@types';
import React, { useMemo } from 'react';
import { NFTAssetImageCardWrapper } from './nft-asset-image-card.styles';

export interface NFTAssetImageCardProps {
  asset: GRC721Model;
  queryGRC721TokenUri: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
}

const NFTAssetImageCard: React.FC<NFTAssetImageCardProps> = ({ asset, queryGRC721TokenUri }) => {
  const { data: tokenUri, isFetched: isFetchedTokenUri } = queryGRC721TokenUri(
    asset.packagePath,
    asset.tokenId,
    {
      enabled: asset.isTokenUri,
      refetchOnMount: true,
    },
  );

  const isFetchedTokenUriWithEnabled = useMemo(() => {
    if (asset.isTokenUri) {
      return true;
    }

    return isFetchedTokenUri;
  }, [asset, isFetchedTokenUri]);

  return (
    <NFTAssetImageCardWrapper>
      <NFTCardImage image={tokenUri} isFetched={isFetchedTokenUriWithEnabled} />
    </NFTAssetImageCardWrapper>
  );
};

export default NFTAssetImageCard;
