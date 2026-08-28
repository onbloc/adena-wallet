import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721CollectionModel, GRC721Model } from '@types';

const GRC721_TOKENS_STALE_TIME = 30_000;

export const useGetGRC721Tokens = (
  collection: GRC721CollectionModel | null,
  options?: UseQueryOptions<GRC721Model[] | null, Error>,
): UseQueryResult<GRC721Model[] | null> => {
  const { tokenService } = useAdenaContext();
  const { currentFundingAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<GRC721Model[] | null, Error>({
    queryKey: [
      'nft/useGetGRC721Tokens',
      currentFundingAddress || '',
      currentNetwork.chainId,
      collection?.packagePath,
    ],
    queryFn: async () => {
      if (!currentFundingAddress || !collection) {
        return null;
      }

      const tokens = await tokenService
        .fetchGRC721Tokens(collection.packagePath, currentFundingAddress)
        .catch(() => []);

      return tokens
        .map((token) => ({
          ...token,
          name: collection.name,
          symbol: collection.symbol,
          isTokenUri: collection.isTokenUri,
          isMetadata: collection.isMetadata,
        }))
        .reverse();
    },
    // One indexer query per collection, replayed on every remount without this.
    staleTime: GRC721_TOKENS_STALE_TIME,
    keepPreviousData: false,
    refetchOnMount: true,
    ...options,
  });
};
