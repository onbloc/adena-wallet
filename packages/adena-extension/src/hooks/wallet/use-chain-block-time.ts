import { useQuery } from '@tanstack/react-query';

import { useWalletContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';

export const GET_CHAIN_BLOCK_TIME_QUERY_KEY = 'wallet/useChainBlockTime';

/**
 * Unix seconds of the chain's latest block, or null until one has been read.
 *
 * Vesting is enforced at `ctx.BlockTime()`, so anything that decides what a
 * holder can actually transfer has to follow the chain's clock rather than the
 * device's: a fast local clock (or a stalled chain) would otherwise report
 * funds as released before the chain agrees.
 *
 * Several callers share one cache entry; React Query polls at the shortest
 * interval any active observer asks for, so a background caller can keep the
 * value warm cheaply while an open panel refreshes it quickly.
 */
export const useChainBlockTime = (enabled: boolean, refetchIntervalMs: number): number | null => {
  const { gnoProvider } = useWalletContext();
  const { currentNetwork } = useNetwork();

  const { data } = useQuery<number | null>({
    queryKey: [GET_CHAIN_BLOCK_TIME_QUERY_KEY, currentNetwork.chainId],
    queryFn: async () => {
      if (!gnoProvider) {
        return null;
      }

      const status = await gnoProvider.getStatus();
      const parsed = Date.parse(status?.sync_info?.latest_block_time ?? '');
      return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
    },
    refetchInterval: refetchIntervalMs,
    // Deliberately off: a refetch on the same key already keeps the previous
    // reading on screen, while carrying one ACROSS a key change would hand a
    // new chain the old chain's clock — which can sit far in its future and
    // report a grant as released early.
    keepPreviousData: false,
    enabled: enabled && !!gnoProvider,
  });

  return data ?? null;
};
