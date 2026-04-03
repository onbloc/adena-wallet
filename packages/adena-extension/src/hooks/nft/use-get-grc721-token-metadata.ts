import { useAdenaContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import {
  keepPreviousData, useQuery, UseQueryOptions, UseQueryResult
} from '@tanstack/react-query';
import { GRC721MetadataModel } from '@types';

export const useGetGRC721TokenMetadata = (
  packagePath: string,
  tokenId: string,
  options?: Omit<UseQueryOptions<GRC721MetadataModel | null, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<GRC721MetadataModel | null> => {
  const { tokenService } = useAdenaContext();
  const { currentNetwork } = useNetwork();

  return useQuery<GRC721MetadataModel | null, Error>({
    queryKey: ['nft/useGetGRC721TokenMetadata', packagePath, tokenId, currentNetwork.chainId],
    queryFn: () => tokenService.fetchGRC721TokenMetadata(packagePath, tokenId).catch(() => null),
    placeholderData: keepPreviousData,
    ...options
  });
};
