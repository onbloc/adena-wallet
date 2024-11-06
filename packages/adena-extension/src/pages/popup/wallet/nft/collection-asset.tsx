import styled, { useTheme } from 'styled-components';

import { Button } from '@components/atoms';
import NFTAssetImageCard from '@components/molecules/nft-asset-image-card/nft-asset-image-card';
import NFTAssetHeader from '@components/pages/nft-asset/nft-asset-header/nft-asset-header';
import NFTAssetMetadata from '@components/pages/nft-asset/nft-asset-metadata/nft-asset-metadata';
import { useNFTCollectionHandler } from '@hooks/nft/use-collection-handler';
import { useGetGRC721Collections } from '@hooks/nft/use-get-grc721-collections';
import { useGetGRC721PinnedCollections } from '@hooks/nft/use-get-grc721-pinned-collections';
import { useGetGRC721TokenMetadata } from '@hooks/nft/use-get-grc721-token-metadata';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import { RoutePath } from '@types';
import { useCallback, useMemo } from 'react';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: fit-content;
  padding-top: 24px;
  padding-bottom: 96px;
  gap: 12px;
  background-color: ${getTheme('neutral', '_8')};

  .send-button {
    flex-shrink: 0;
    ${fonts.body1Bold}
  }

  .empty-block {
    display: flex;
    flex-shrink: 0;
    width: 100%;
    height: 60px;
  }
`;

export const NftCollectionAsset = (): JSX.Element => {
  const theme = useTheme();
  const { openScannerLink } = useLink();
  const { params, navigate, goBack } = useAppNavigate<RoutePath.NftCollectionAsset>();
  const { pinCollection, unpinCollection, showCollection, hideCollection } =
    useNFTCollectionHandler();
  const collectionAsset = params.collectionAsset;

  const { data: collections, refetch: refetchCollections } = useGetGRC721Collections({
    refetchOnMount: true,
  });

  const { data: pinnedCollections, refetch: refetchPinnedCollection } =
    useGetGRC721PinnedCollections({
      refetchOnMount: true,
    });

  const title = useMemo(() => {
    return `${collectionAsset.name} #${collectionAsset.tokenId}`;
  }, [collectionAsset]);

  const pinnedCollection = useMemo(() => {
    if (!pinnedCollections) {
      return false;
    }

    return !!pinnedCollections.find((packagePath) => packagePath === collectionAsset.packagePath);
  }, [collectionAsset, pinnedCollections]);

  const visibleCollection = useMemo(() => {
    if (!collections) {
      return false;
    }

    const currentCollection = collections.find(
      (collection) => collection.packagePath === collectionAsset.packagePath,
    );

    if (!currentCollection) {
      return false;
    }

    return currentCollection.display;
  }, [collectionAsset, collections]);

  const moveGnoscanCollection = useCallback(() => {
    openScannerLink('/realms/details', { path: params.collectionAsset.packagePath });
  }, [openScannerLink]);

  const pinCollectionWithRefetch = useCallback(async () => {
    await pinCollection(collectionAsset.packagePath);
    await refetchPinnedCollection();
  }, [collectionAsset.packagePath, pinCollection]);

  const unpinCollectionWithRefetch = useCallback(async () => {
    await unpinCollection(collectionAsset.packagePath);
    await refetchPinnedCollection();
  }, [collectionAsset.packagePath, unpinCollection]);

  const showCollectionWithRefetch = useCallback(async () => {
    await showCollection(collectionAsset.packagePath);
    await refetchCollections();
  }, [collectionAsset.packagePath, showCollection]);

  const hideCollectionWithRefetch = useCallback(async () => {
    await hideCollection(collectionAsset.packagePath);
    await refetchCollections();
  }, [collectionAsset.packagePath, hideCollection]);

  const onClickSend = useCallback(() => {
    navigate(RoutePath.NftTransferInput, {
      state: {
        collectionAsset,
      },
    });
  }, [collectionAsset]);

  return (
    <Wrapper>
      <NFTAssetHeader
        title={title}
        pinned={pinnedCollection}
        visible={visibleCollection}
        moveBack={goBack}
        openGnoscanCollection={moveGnoscanCollection}
        pinCollection={pinCollectionWithRefetch}
        unpinCollection={unpinCollectionWithRefetch}
        showCollection={showCollectionWithRefetch}
        hideCollection={hideCollectionWithRefetch}
      />

      <NFTAssetImageCard asset={collectionAsset} queryGRC721TokenUri={useGetGRC721TokenUri} />

      <Button
        className='send-button'
        bgColor={theme.primary._6}
        fullWidth
        onClick={onClickSend}
        margin={'4px 0 0 0'}
      >
        Send
      </Button>

      <NFTAssetMetadata
        asset={collectionAsset}
        queryGRC721TokenMetadata={useGetGRC721TokenMetadata}
      />

      <div className='empty-block' />
    </Wrapper>
  );
};
