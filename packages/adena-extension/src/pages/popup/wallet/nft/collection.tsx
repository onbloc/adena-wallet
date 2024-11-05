/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import NFTCollectionAssets from '@components/pages/nft-collection/nft-collection-assets/nft-collection-assets';
import NFTCollectionHeader from '@components/pages/nft-collection/nft-collection-header/nft-collection-header';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import { useGetGRC721Tokens } from '@hooks/nft/use-get-grc721-tokens';
import { useIsLoadingNFT } from '@hooks/nft/use-is-loading-nft';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import { GRC721Model, RoutePath } from '@types';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  gap: 12px;
  background-color: ${getTheme('neutral', '_8')};
`;

export const NftCollection = (): JSX.Element => {
  const { openScannerLink } = useLink();
  const { params, navigate, goBack } = useAppNavigate<RoutePath.NftCollection>();

  const { data: grc721Tokens, isFetched: isFetchedGRC721Tokens } = useGetGRC721Tokens(
    params.collection,
    {
      refetchOnMount: true,
    },
  );

  const fetchingCount = useIsLoadingNFT();

  const isFinishFetchedGRC721Tokens = useMemo(() => {
    return fetchingCount === 0 && isFetchedGRC721Tokens;
  }, [fetchingCount, isFetchedGRC721Tokens]);

  const title = useMemo(() => {
    return params.collection.name;
  }, [params.collection]);

  const moveBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const moveGnoscanCollection = useCallback(() => {
    openScannerLink('/realms/details', { path: params.collection.packagePath });
  }, [openScannerLink]);

  const moveCollectionAssetPage = useCallback(
    (grc721Token: GRC721Model) => {
      navigate(RoutePath.NftCollectionAsset, {
        state: {
          collectionAsset: grc721Token,
        },
      });
    },
    [navigate],
  );

  return (
    <Wrapper>
      <NFTCollectionHeader
        title={title}
        moveBack={moveBack}
        openGnoscanCollection={moveGnoscanCollection}
      />
      <NFTCollectionAssets
        tokens={grc721Tokens}
        isFetchedTokens={isFinishFetchedGRC721Tokens}
        moveAssetPage={moveCollectionAssetPage}
        queryGRC721TokenUri={useGetGRC721TokenUri}
      />
    </Wrapper>
  );
};
