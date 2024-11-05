import { useAdenaContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export const GET_GRC721_TOKEN_URI_QUERY_KEY = 'nft/useGetGRC721TokenUri';

export const useGetGRC721TokenUri = (
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
): UseQueryResult<string | null> => {
  const { tokenService } = useAdenaContext();
  const { currentNetwork } = useNetwork();

  return useQuery<string | null, Error>({
    queryKey: [GET_GRC721_TOKEN_URI_QUERY_KEY, packagePath, tokenId, currentNetwork.chainId],
    queryFn: () => tokenService.fetchGRC721TokenUri(packagePath, tokenId).catch(() => null),
    staleTime: Infinity,
    ...options,
  });
};
