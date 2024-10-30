import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export const useGetGRC721TokenUri = (
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
): UseQueryResult<string | null> => {
  const { tokenService } = useAdenaContext();

  return useQuery<string | null, Error>({
    queryKey: ['nft/useGetGRC721TokenUri', packagePath, tokenId],
    queryFn: () => tokenService.fetchGRC721TokenUri(packagePath, tokenId).catch(() => null),
    staleTime: Infinity,
    ...options,
  });
};
