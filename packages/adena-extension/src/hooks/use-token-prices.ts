import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { TokenPriceMap, TokenPriceRequest } from '@types';

import { useAdenaContext } from './use-context';

// Matches the Gno balance interval so the headline value and the balances it
// is derived from never drift visibly apart.
const PRICE_REFETCH_INTERVAL = 5_000;

const EMPTY_PRICES: TokenPriceMap = {};

/**
 * USD quotes for the given tokens, refreshed in the background. `requests` may
 * be a fresh array on every render — the query is keyed on the token identities
 * it contains, not on the array reference.
 */
export const useTokenPrices = (
  requests: TokenPriceRequest[],
): {
  tokenPrices: TokenPriceMap;
  isFetched: boolean;
} => {
  const { tokenPriceService } = useAdenaContext();

  const requestKey = useMemo(
    () =>
      requests
        .map((request) => `${request.tokenId}:${request.networkId}:${request.symbol}`)
        .sort()
        .join('|'),
    [requests],
  );

  const { data, isFetched } = useQuery<TokenPriceMap>(
    ['token-prices', requestKey],
    () => tokenPriceService.getTokenPrices(requests),
    {
      refetchInterval: PRICE_REFETCH_INTERVAL,
      keepPreviousData: true,
      enabled: requests.length > 0,
    },
  );

  return {
    tokenPrices: data ?? EMPTY_PRICES,
    isFetched,
  };
};
