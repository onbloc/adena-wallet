import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721CollectionModel } from '@types';

export const useGetAllGRC721Collections = (
  options?: UseQueryOptions<GRC721CollectionModel[] | null, Error>,
): UseQueryResult<GRC721CollectionModel[] | null> => {
  const { tokenService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { currentAccount } = useCurrentAccount();

  return useQuery<GRC721CollectionModel[] | null, Error>({
    queryKey: ['nft/useGetAllGRC721Collections', currentNetwork.id],
    queryFn: () => tokenService.fetchGRC721Collections(),
    staleTime: Infinity,
    enabled: !!currentAccount,
    ...options,
  });
};
