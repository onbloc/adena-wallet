import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721CollectionModel } from '@types';

export const GET_GRC721_COLLECTIONS_QUERY_KEY = 'nft/useGetGRC721Collections';

export const useGetGRC721Collections = (
  options?: UseQueryOptions<GRC721CollectionModel[] | null, Error>,
): UseQueryResult<GRC721CollectionModel[] | null> => {
  const { tokenService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<GRC721CollectionModel[] | null, Error>({
    queryKey: [GET_GRC721_COLLECTIONS_QUERY_KEY, currentAccount?.id || '', currentNetwork.chainId],
    queryFn: async () => {
      if (!currentAccount) {
        return null;
      }

      const collections = await tokenService
        .getAccountGRC721Collections(currentAccount.id, currentNetwork.chainId)
        .catch(() => []);

      return collections.map((collection) => ({ ...collection, tokenId: '0' }));
    },
    staleTime: Infinity,
    keepPreviousData: true,
    ...options,
  });
};
