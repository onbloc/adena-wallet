import { Query, useQuery, UseQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { ChartRange, TokenMarketData } from '../domain/market';
import { Network } from '../domain/network';
import { Token } from '../domain/token';
import { NO_ID_KEY, queryKeys } from './query-keys';

type MarketQuery = Query<TokenMarketData, Error, TokenMarketData, ReturnType<typeof queryKeys.marketData>>;

export const useMarketDataQuery = (token: Token | undefined, network: Network, range: ChartRange): UseQueryResult<TokenMarketData, Error> => {
  const { marketDataService } = useContainer();

  const queryKey = queryKeys.marketData(network.id, token?.id ?? NO_ID_KEY, range);

  // Only a range change keeps the previous chart on screen; another token or network never borrows its data.
  const keepSameAsset = (previous: TokenMarketData | undefined, previousQuery: MarketQuery | undefined): TokenMarketData | undefined => {
    const sameAsset = previousQuery?.queryKey[2] === queryKey[2] && previousQuery?.queryKey[3] === queryKey[3];

    return sameAsset ? previous : undefined;
  };

  return useQuery({
    queryKey,
    queryFn: () => marketDataService.getMarketData(token as Token, network, range),
    enabled: Boolean(token),
    placeholderData: keepSameAsset,
    staleTime: 60_000,
  });
};
