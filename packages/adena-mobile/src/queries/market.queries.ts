import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { ChartRange, TokenMarketData } from '../domain/market';
import { Network } from '../domain/network';
import { Token } from '../domain/token';
import { NO_ID_KEY, queryKeys } from './query-keys';

export const useMarketDataQuery = (token: Token | undefined, network: Network, range: ChartRange): UseQueryResult<TokenMarketData, Error> => {
  const { marketDataService } = useContainer();

  return useQuery({
    queryKey: queryKeys.marketData(network.id, token?.id ?? NO_ID_KEY, range),
    queryFn: () => marketDataService.getMarketData(token as Token, network, range),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
};
