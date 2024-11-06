import NFTCardImage from '@components/molecules/nft-card-image/nft-card-image';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721Model } from '@types';
import React, { useCallback, useMemo } from 'react';
import { NFTCollectionAssetCardWrapper } from './nft-collection-asset-card.styles';

export interface NFTCollectionAssetCardProps {
  grc721Token: GRC721Model;
  queryGRC721TokenUri: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  moveAssetPage: (grc721Token: GRC721Model) => void;
}

const NFTCollectionAssetCard: React.FC<NFTCollectionAssetCardProps> = ({
  grc721Token,
  queryGRC721TokenUri,
  moveAssetPage,
}) => {
  const { data: tokenUri, isFetched: isFetchedTokenUri } = queryGRC721TokenUri(
    grc721Token.packagePath,
    grc721Token.tokenId,
    {
      enabled: grc721Token.isTokenUri,
    },
  );

  const isFetchedCardTokenUri = useMemo(() => {
    if (!grc721Token.isTokenUri) {
      return true;
    }

    return isFetchedTokenUri;
  }, [grc721Token, isFetchedTokenUri]);

  const tokenName = useMemo(() => {
    return `${grc721Token.name}`;
  }, [grc721Token.name]);

  const tokenId = useMemo(() => {
    return `#${grc721Token.tokenId}`;
  }, [grc721Token.tokenId]);

  const onClickCard = useCallback(() => {
    moveAssetPage(grc721Token);
  }, [grc721Token, moveAssetPage]);

  return (
    <NFTCollectionAssetCardWrapper onClick={onClickCard}>
      <NFTCardImage image={tokenUri} isFetched={isFetchedCardTokenUri} hasBadge />

      <div className='info-static-wrapper'>
        <div className='name-wrapper'>{tokenName}</div>
        <div className='id-wrapper'>{tokenId}</div>
      </div>
    </NFTCollectionAssetCardWrapper>
  );
};

export default NFTCollectionAssetCard;
