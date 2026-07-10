import { isSessionAccount } from 'adena-module';
import styled from 'styled-components';

import NFTCollections from '@components/pages/nft/nft-collections/nft-collections';
import NFTHeader from '@components/pages/nft/nft-header/nft-header';
import { useNFTCollectionHandler } from '@hooks/nft/use-collection-handler';
import { useGetGRC721Balance } from '@hooks/nft/use-get-grc721-balance';
import { useGetGRC721Collections } from '@hooks/nft/use-get-grc721-collections';
import { useGetGRC721PinnedCollections } from '@hooks/nft/use-get-grc721-pinned-collections';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import { useIsLoadingNFT } from '@hooks/nft/use-is-loading-nft';
import useAppNavigate from '@hooks/use-app-navigate';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useIsCurrentSessionRevoked } from '@hooks/wallet/use-current-session-revoked';
import mixins from '@styles/mixins';
import { revokedDimStyle } from '@styles/session-revoked';
import { getTheme } from '@styles/theme';
import { GRC721CollectionModel, RoutePath } from '@types';
import { useCallback, useMemo } from 'react';

const Wrapper = styled.main<{ $dimmed: boolean }>`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: auto;
  flex-shrink: 0;
  padding-top: 24px;
  padding-bottom: 96px;
  gap: 12px;
  background-color: ${getTheme('neutral', '_8')};

  ${revokedDimStyle}
`;

export const Nft = (): JSX.Element => {
  const { currentAccount, currentFundingAddress } = useCurrentAccount();
  const { navigate } = useAppNavigate();
  const { openScannerLink } = useLink();
  const sessionRevoked = useIsCurrentSessionRevoked();

  // A SessionAccount address can never receive tokens, so the NFT deposit entry
  // point is hidden and navigation to the Deposit page is blocked.
  const isSession = useMemo(
    () => (currentAccount ? isSessionAccount(currentAccount) : false),
    [currentAccount],
  );

  const { data: collections, isFetched: isFetchedCollections } = useGetGRC721Collections({
    refetchOnMount: true,
  });
  const {
    data: pinnedCollections,
    isFetched: isFetchedPinnedCollections,
    refetch: refetchPinnedCollection,
  } = useGetGRC721PinnedCollections({
    refetchOnMount: true,
  });

  const { pinCollection, unpinCollection } = useNFTCollectionHandler();

  const fetchingCount = useIsLoadingNFT();

  const isFinishFetchedCollections = useMemo(() => {
    return fetchingCount === 0 && isFetchedCollections;
  }, [fetchingCount, isFetchedCollections]);

  const pin = useCallback(
    async (packagePath: string) => {
      await pinCollection(packagePath);
      await refetchPinnedCollection();
    },
    [pinCollection],
  );

  const unpin = useCallback(
    async (packagePath: string) => {
      await unpinCollection(packagePath);
      await refetchPinnedCollection();
    },
    [unpinCollection],
  );

  const openGnoscan = useCallback(() => {
    if (!currentFundingAddress) {
      return;
    }
    openScannerLink('/account/' + currentFundingAddress);
  }, [currentFundingAddress, openScannerLink]);

  const moveDepositPage = useCallback(() => {
    if (isSession) {
      return;
    }
    navigate(RoutePath.Deposit, {
      state: {
        token: {
          symbol: 'NFT',
        },
        type: 'token',
      },
    });
  }, [navigate, isSession]);

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
    <Wrapper $dimmed={sessionRevoked}>
      <NFTHeader
        openGnoscan={openGnoscan}
        moveDepositPage={moveDepositPage}
        isSessionAccount={isSession}
      />
      <NFTCollections
        collections={collections}
        isFetchedCollections={isFinishFetchedCollections}
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
