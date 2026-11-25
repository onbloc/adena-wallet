import { useQueries } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { Network } from '../domain/network';
import { nftLookupStaleTime } from '../queries/nft.queries';
import { queryKeys } from '../queries/query-keys';

export interface NftImageRequest {
  key: string;
  packagePath: string;
  nftId?: string;
  enabled: boolean;
}

// Resolves token URIs for a list of NFTs; found ones are cached for the session.
export interface NftImageState {
  uri: string | null;
  loading: boolean;
}

export const useNftImages = (network: Network, requests: NftImageRequest[]): Record<string, NftImageState> => {
  const { nftService } = useContainer();
  // Requests for the same realm and token id share one lookup, as the chain answers them identically.
  const lookups = new Map<string, { packagePath: string; nftId?: string; enabled: boolean }>();
  const lookupKey = (request: NftImageRequest): string => JSON.stringify([request.packagePath, request.nftId ?? '']);

  requests.forEach((request) => {
    const current = lookups.get(lookupKey(request));

    lookups.set(lookupKey(request), { packagePath: request.packagePath, nftId: request.nftId, enabled: Boolean(current?.enabled) || request.enabled });
  });

  const keys = [...lookups.keys()];
  const results = useQueries({
    queries: [...lookups.values()].map(lookup => ({
      queryKey: queryKeys.nftUri(network.id, lookup.packagePath, lookup.nftId ?? ''),
      queryFn: (): Promise<string | null> => nftService.getTokenUri(network, lookup.packagePath, lookup.nftId as string),
      enabled: lookup.enabled && Boolean(lookup.nftId),
      staleTime: nftLookupStaleTime,
    })),
  });

  return Object.fromEntries(requests.map((request) => {
    const result = results[keys.indexOf(lookupKey(request))];

    return [request.key, { uri: result?.data ?? null, loading: Boolean(request.nftId) && request.enabled && result?.isPending }];
  })) as Record<string, { uri: string | null; loading: boolean }>;
};
