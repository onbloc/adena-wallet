import { Text } from '@components/atoms';
import { LoadingNft } from '@components/molecules';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721CollectionModel } from '@types';
import React, { useCallback, useMemo } from 'react';
import { useTheme } from 'styled-components';
import ManageCollectionsButton from '../manage-collections-button/manage-collections-button';
import NFTCollectionCard from '../nft-collection-card/nft-collection-card';
import { NFTCollectionsWrapper } from './nft-collections.styles';

export interface NFTCollectionsProps {
  collections: GRC721CollectionModel[] | null | undefined;
  isFetchedCollections: boolean;
  pinnedCollections: string[] | null | undefined;
  isFetchedPinnedCollections: boolean;
  pin: (packagePath: string) => Promise<void>;
  unpin: (packagePath: string) => Promise<void>;
  queryGRC721TokenUri: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  queryGRC721Balance: (
    packagePath: string,
    options?: UseQueryOptions<number | null, Error>,
  ) => UseQueryResult<number | null>;
  moveCollectionPage: (collection: GRC721CollectionModel) => void;
  moveManageCollectionsPage: () => void;
}

const NFTCollections: React.FC<NFTCollectionsProps> = ({
  isFetchedCollections,
  collections,
  isFetchedPinnedCollections,
  pinnedCollections,
  pin,
  unpin,
  queryGRC721TokenUri,
  queryGRC721Balance,
  moveCollectionPage,
  moveManageCollectionsPage,
}) => {
  const theme = useTheme();

  const isLoading = useMemo(() => {
    if (!isFetchedCollections || !isFetchedPinnedCollections) {
      return true;
    }

    return collections === null;
  }, [isFetchedCollections, isFetchedPinnedCollections, collections]);

  const isEmptyCollections = useMemo(() => {
    return collections?.length === 0;
  }, [collections]);

  const isEmptyDisplayCollections = useMemo(() => {
    return collections?.filter((collection) => collection.display).length === 0;
  }, [collections]);

  const sortedCollections = useMemo(() => {
    if (!Array.isArray(collections)) {
      return collections;
    }

    if (!Array.isArray(pinnedCollections)) {
      return null;
    }

    const pinned = pinnedCollections
      .map((packagePath) =>
        collections.find((collection) => collection.packagePath === packagePath),
      )
      .filter((collection) => !!collection) as GRC721CollectionModel[];

    const unpinned = collections.filter(
      (collection) => !pinnedCollections.includes(collection.packagePath),
    );

    return [...pinned, ...unpinned];
  }, [pinnedCollections, collections]);

  const exitsPinnedCollections = useCallback(
    (collection: GRC721CollectionModel) => {
      if (!pinnedCollections) {
        return false;
      }

      return pinnedCollections.findIndex((path) => path === collection.packagePath) > -1;
    },
    [pinnedCollections],
  );

  const onClickManageCollectionsButton = useCallback(() => {
    moveManageCollectionsPage();
  }, [moveManageCollectionsPage]);

  if (isLoading) {
    return <LoadingNft />;
  }

  if (isEmptyCollections) {
    return (
      <NFTCollectionsWrapper>
        <Text className='description' type='body1Reg' color={theme.neutral.a}>
          No NFTs to display
        </Text>
      </NFTCollectionsWrapper>
    );
  }

  if (isEmptyDisplayCollections) {
    return (
      <NFTCollectionsWrapper className='non-items'>
        <ManageCollectionsButton onClick={onClickManageCollectionsButton} />
      </NFTCollectionsWrapper>
    );
  }

  return (
    <NFTCollectionsWrapper>
      <div className='collection-wrapper'>
        {sortedCollections?.map((collection, index) => (
          <NFTCollectionCard
            key={index}
            grc721Collection={collection}
            pin={(collection: GRC721CollectionModel): void => {
              pin(collection.packagePath);
            }}
            unpin={(collection: GRC721CollectionModel): void => {
              unpin(collection.packagePath);
            }}
            exitsPinnedCollections={exitsPinnedCollections}
            queryGRC721Balance={queryGRC721Balance}
            queryGRC721TokenUri={queryGRC721TokenUri}
            moveCollectionPage={moveCollectionPage}
          />
        ))}
      </div>

      <div className='manage-collection-button-wrapper'>
        <ManageCollectionsButton onClick={onClickManageCollectionsButton} />
      </div>
    </NFTCollectionsWrapper>
  );
};

export default NFTCollections;
