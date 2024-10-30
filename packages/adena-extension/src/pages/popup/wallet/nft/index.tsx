import styled from 'styled-components';

import NFTCollections from '@components/pages/nft/nft-collections/nft-collections';
import NFTHeader from '@components/pages/nft/nft-header/nft-header';
import { useNFTCollectionHandler } from '@hooks/nft/use-collection-handler';
import { useGetGRC721Balance } from '@hooks/nft/use-get-grc721-balance';
import { useGetGRC721Collections } from '@hooks/nft/use-get-grc721-collections';
import { useGetGRC721PinnedCollections } from '@hooks/nft/use-get-grc721-pinned-collections';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import useAppNavigate from '@hooks/use-app-navigate';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import { GRC721CollectionModel, RoutePath } from '@types';
import { useCallback } from 'react';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  gap: 8px;
  background-color: ${getTheme('neutral', '_8')};
`;

export const Nft = (): JSX.Element => {
  const { navigate } = useAppNavigate();

  const { data: collections, isFetched: isFetchedCollections } = useGetGRC721Collections();
  const {
    data: pinnedCollections,
    isFetched: isFetchedPinnedCollections,
    refetch: refetchPinnedCollection,
  } = useGetGRC721PinnedCollections();

  const { pinCollection, unpinCollection } = useNFTCollectionHandler();

  const pin = useCallback(
    async (packagePath: string) => {
      await pinCollection(packagePath).then(() => refetchPinnedCollection);
    },
    [pinCollection],
  );

  const unpin = useCallback(
    async (packagePath: string) => {
      await unpinCollection(packagePath).then(() => refetchPinnedCollection);
    },
    [unpinCollection],
  );

  const moveCollectionPage = useCallback(
    (collection: GRC721CollectionModel) => {
      navigate(RoutePath.NftCollection, { state: { collection } });
    },
    [navigate],
  );

  const moveManageCollectionsPage = useCallback(() => {
    navigate(RoutePath.ManageNft);
  }, [navigate]);

  return (
    <Wrapper>
      <NFTHeader />
      <NFTCollections
        collections={collections}
        isFetchedCollections={isFetchedCollections}
        pinnedCollections={pinnedCollections}
        isFetchedPinnedCollections={isFetchedPinnedCollections}
        pin={pin}
        unpin={unpin}
        moveCollectionPage={moveCollectionPage}
        moveManageCollectionsPage={moveManageCollectionsPage}
        queryGRC721Balance={useGetGRC721Balance}
        queryGRC721TokenUri={useGetGRC721TokenUri}
      />
    </Wrapper>
  );
};
