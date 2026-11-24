import { InfiniteData, useInfiniteQuery, UseInfiniteQueryResult, useQuery, UseQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { NftCollection, NftItem, NftMetadata, Page } from '../domain/nft';
import { NO_ID_KEY, queryKeys } from './query-keys';

export const useNftCollectionsQuery = (account: Account | null, network: Network): UseQueryResult<NftCollection[], Error> => {
  const { nftService } = useContainer();

  return useQuery({
    queryKey: queryKeys.nftCollections(network.id, account?.id ?? NO_ID_KEY),
    queryFn: () => nftService.getCollections(account as Account, network),
    enabled: Boolean(account) && nftService.isSupported(network),
    staleTime: 60_000,
  });
};

export const useNftItemsQuery = (account: Account | null, network: Network, collection?: NftCollection): UseInfiniteQueryResult<InfiniteData<Page<NftItem>, unknown>, Error> => {
  const { nftService } = useContainer();

  return useInfiniteQuery({
    queryKey: queryKeys.nftItems(network.id, account?.id ?? NO_ID_KEY, collection?.id ?? NO_ID_KEY),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => nftService.getItems(account as Account, network, collection as NftCollection, pageParam),
    getNextPageParam: page => (page.hasNext ? page.cursor : undefined),
    enabled: Boolean(account && collection),
  });
};

export const useNftTokenUriQuery = (network: Network, packagePath: string, nftId?: string, enabled = true): UseQueryResult<string | null, Error> => {
  const { nftService } = useContainer();

  return useQuery({
    queryKey: queryKeys.nftUri(network.id, packagePath, nftId ?? ''),
    queryFn: () => nftService.getTokenUri(network, packagePath, nftId as string),
    enabled: enabled && Boolean(nftId),
    staleTime: Infinity,
  });
};

export const useNftMetadataQuery = (network: Network, packagePath: string, nftId: string, enabled = true): UseQueryResult<NftMetadata | null, Error> => {
  const { nftService } = useContainer();

  return useQuery({
    queryKey: queryKeys.nftMetadata(network.id, packagePath, nftId),
    queryFn: () => nftService.getMetadata(network, packagePath, nftId),
    enabled,
    staleTime: Infinity,
  });
};
