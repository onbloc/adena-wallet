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
  const isQueryEnabled = !!asset.isTokenUri && !!asset.packagePath && !!asset.tokenId;

  const { data: tokenUri, isFetched: isFetchedTokenUri } = queryGRC721TokenUri(
    asset.packagePath,
    asset.tokenId,
    {
      enabled: isQueryEnabled,
      refetchOnMount: true,
    },
  );

  // A disabled query never reports `isFetched`, so without this the card would
  // render its loading skeleton forever for a realm that publishes no
  // `TokenURI`. Nothing is coming — show the empty-image placeholder instead.
  const isFetchedTokenUriWithEnabled = useMemo(() => {
    if (!isQueryEnabled) {
      return true;
    }

    return isFetchedTokenUri;
  }, [isQueryEnabled, isFetchedTokenUri]);

  return (
    <NFTAssetImageCardWrapper>
      <NFTCardImage image={tokenUri} isFetched={isFetchedTokenUriWithEnabled} />
    </NFTAssetImageCardWrapper>
  );
};

export default NFTAssetImageCard;
