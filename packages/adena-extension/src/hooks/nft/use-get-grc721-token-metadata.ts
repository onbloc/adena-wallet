import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721MetadataModel } from '@types';

export const useGetGRC721TokenMetadata = (
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<GRC721MetadataModel | null, Error>,
): UseQueryResult<GRC721MetadataModel | null> => {
  const { tokenService } = useAdenaContext();

  return useQuery<GRC721MetadataModel | null, Error>({
    queryKey: ['nft/useGetGRC721TokenMetadata', packagePath, tokenId],
    queryFn: () => tokenService.fetchGRC721TokenMetadata(packagePath, tokenId).catch(() => null),
    keepPreviousData: true,
    ...options,
  });
};
