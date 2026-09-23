import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { TokenPriceMap, TokenPriceRequest } from '@types';

import { useAdenaContext } from './use-context';

// Matches the Gno balance interval so the headline value and the balances it
// is derived from never drift visibly apart.
const PRICE_REFETCH_INTERVAL = 5_000;

const EMPTY_PRICES: TokenPriceMap = {};

/**
 * Quotes stamped with the endpoint that produced them, so a result carried over
 * from a previous source can be recognised and discarded.
 */
interface SourcedPrices {
  sourceId: string;
  prices: TokenPriceMap;
}

/**
 * USD quotes for the given tokens, refreshed in the background. `requests` may
 * be a fresh array on every render — the query is keyed on the token identities
 * it contains, not on the array reference.
 *
 * The key also carries the API source, because a network switch changes the
 * endpoint without necessarily changing the tokens on screen. `keepPreviousData`
 * smooths a change to the token set, but it would also hand back the previous
 * endpoint's quotes across such a switch, so a result is only read when its
 * stamp matches the source asking for it.
 */
export const useTokenPrices = (
  requests: TokenPriceRequest[],
): {
  tokenPrices: TokenPriceMap;
  isFetched: boolean;
} => {
  const { tokenPriceService } = useAdenaContext();
  const sourceId = tokenPriceService.sourceId;

  const requestKey = useMemo(
    () =>
      requests
        .map((request) => `${request.tokenId}:${request.networkId}`)
        .sort()
        .join('|'),
    [requests],
  );

  const { data, isFetched } = useQuery<SourcedPrices>(
    ['token-prices', sourceId, requestKey],
    async () => ({
      sourceId,
      prices: await tokenPriceService.getTokenPrices(requests),
    }),
    {
      refetchInterval: PRICE_REFETCH_INTERVAL,
      keepPreviousData: true,
      enabled: requests.length > 0,
    },
  );

  const isCurrentSource = data?.sourceId === sourceId;

  return {
    tokenPrices: isCurrentSource ? data.prices : EMPTY_PRICES,
    isFetched: isFetched && isCurrentSource,
  };
};
