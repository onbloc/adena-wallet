import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721CollectionModel } from '@types';

export const useGetAllGRC721Collections = (
  options?: UseQueryOptions<GRC721CollectionModel[] | null, Error>,
): UseQueryResult<GRC721CollectionModel[] | null> => {
  const { tokenService } = useAdenaContext();

  return useQuery<GRC721CollectionModel[] | null, Error>({
    queryKey: ['nft/useGetAllGRC721Collections'],
    queryFn: async () => {
      const collections = await tokenService.fetchGRC721Collections();
      if (collections?.length === 0) {
        return [];
      }

      return collections;
    },
    staleTime: Infinity,
    keepPreviousData: true,
    ...options,
  });
};
