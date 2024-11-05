import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721CollectionModel } from '@types';

export const useGetGRC721Collections = (
  options?: UseQueryOptions<GRC721CollectionModel[] | null, Error>,
): UseQueryResult<GRC721CollectionModel[] | null> => {
  const { tokenService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<GRC721CollectionModel[] | null, Error>({
    queryKey: ['nft/useGetGRC721Collections', currentAccount?.id || '', currentNetwork.chainId],
    queryFn: () => {
      if (!currentAccount) {
        return null;
      }

      return tokenService
        .getAccountGRC721Collections(currentAccount.id, currentNetwork.chainId)
        .catch(() => []);
    },
    staleTime: Infinity,
    keepPreviousData: true,
    ...options,
  });
};
