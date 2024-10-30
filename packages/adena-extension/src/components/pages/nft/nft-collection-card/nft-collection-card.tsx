import IconPin from '@assets/icon-pin';
import NFTCardImage from '@components/molecules/nft-card-image/nft-card-image';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721CollectionModel } from '@types';
import BigNumber from 'bignumber.js';
import React, { useCallback, useMemo } from 'react';
import { NFTCollectionCardWrapper } from './nft-collection-card.styles';

export interface NFTCollectionCardProps {
  grc721Collection: GRC721CollectionModel;
  pinned: boolean;
  queryGRC721TokenUri: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  queryGRC721Balance: (
    packagePath: string,
    options?: UseQueryOptions<number | null, Error>,
  ) => UseQueryResult<number | null>;
  pin: () => void;
  unpin: () => void;
  moveCollectionPage: (collection: GRC721CollectionModel) => void;
}

const NFTCollectionCard: React.FC<NFTCollectionCardProps> = ({
  grc721Collection,
  pinned,
  pin,
  unpin,
  queryGRC721TokenUri,
  queryGRC721Balance,
  moveCollectionPage,
}) => {
  const { data: tokenUri, isFetched: isFetchedTokenUri } = queryGRC721TokenUri(
    grc721Collection.packagePath,
    grc721Collection.tokenId,
    {
      enabled: grc721Collection.isTokenUri,
    },
  );

  const { data: balance } = queryGRC721Balance(grc721Collection.packagePath);

  const isFetchedCardTokenUri = useMemo(() => {
    if (!grc721Collection.isTokenUri) {
      return true;
    }

    return isFetchedTokenUri;
  }, [grc721Collection, isFetchedTokenUri]);

  const tokenName = useMemo(() => {
    return `${grc721Collection.name}`;
  }, [grc721Collection.name, grc721Collection.tokenId]);

  const balanceStr = useMemo(() => {
    if (balance === undefined || balance === null) {
      return '';
    }

    return BigNumber(balance).toFormat();
  }, [balance]);

  const onClickPin = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (pinned) {
        unpin();
        return;
      }

      pin();
    },
    [pinned],
  );

  const onClickCard = useCallback(() => {
    moveCollectionPage(grc721Collection);
  }, [grc721Collection, moveCollectionPage]);

  return (
    <NFTCollectionCardWrapper onClick={onClickCard}>
      <NFTCardImage image={tokenUri} isFetched={isFetchedCardTokenUri} hasBadge />

      <div className='info-static-wrapper'>
        <div className='pin-wrapper' onClick={onClickPin}>
          <IconPin className={pinned ? 'icon-pin pinned' : 'icon-pin'} />
        </div>

        <div className='name-wrapper'>{tokenName}</div>

        <div className='balance-wrapper'>{balanceStr}</div>
      </div>
    </NFTCollectionCardWrapper>
  );
};

export default NFTCollectionCard;
