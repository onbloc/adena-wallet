import { useQueries } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { Network } from '../domain/network';
import { queryKeys } from '../queries/query-keys';

export interface NftImageRequest {
  key: string;
  packagePath: string;
  nftId?: string;
  enabled: boolean;
}

// Resolves token URIs for a list of NFTs; results are cached for the session.
export interface NftImageState {
  uri: string | null;
  loading: boolean;
}

export const useNftImages = (network: Network, requests: NftImageRequest[]): Record<string, NftImageState> => {
  const { nftService } = useContainer();
  const results = useQueries({
    queries: requests.map(request => ({
      queryKey: queryKeys.nftUri(network.id, request.packagePath, request.nftId ?? ''),
      queryFn: (): Promise<string | null> => nftService.getTokenUri(network, request.packagePath, request.nftId as string),
      enabled: request.enabled && Boolean(request.nftId),
      staleTime: Infinity,
    })),
  });

  return Object.fromEntries(requests.map((request, index) => [
    request.key,
    { uri: results[index]?.data ?? null, loading: Boolean(request.nftId) && request.enabled && results[index]?.isPending },
  ])) as Record<string, { uri: string | null; loading: boolean }>;
};
