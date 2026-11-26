import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { Order } from '../domain/order';
import { SwapToken } from '../domain/swap';
import { NO_ID_KEY, queryKeys } from './query-keys';

// Keepers fill and run orders at any time, so the list is polled while visible.
const ORDER_REFETCH_INTERVAL_MS = 15_000;
const TOKENS_STALE_MS = 5 * 60 * 1000;

export const useOrdersQuery = (account: Account | null, network: Network): UseQueryResult<Order[], Error> => {
  const { orderService } = useContainer();

  return useQuery({
    queryKey: queryKeys.orders(network.id, account?.id ?? NO_ID_KEY),
    queryFn: () => orderService.listOrders(account as Account, network),
    enabled: Boolean(account) && orderService.isSupported(network),
    refetchInterval: ORDER_REFETCH_INTERVAL_MS,
  });
};

// Same list and cache as Swap: the order realms trade GnoSwap's tokens.
export const useOrderTokensQuery = (network: Network): UseQueryResult<SwapToken[], Error> => {
  const { orderService } = useContainer();

  return useQuery({
    queryKey: queryKeys.swapTokens(network.id),
    queryFn: () => orderService.getTokens(network),
    enabled: orderService.isSupported(network),
    staleTime: TOKENS_STALE_MS,
  });
};

export const useOrderBalancesQuery = (account: Account | null, network: Network, tokens: SwapToken[]): UseQueryResult<Record<string, string>, Error> => {
  const { orderService } = useContainer();

  return useQuery({
    queryKey: queryKeys.swapBalances(network.id, account?.id ?? NO_ID_KEY, tokens.map(token => token.id)),
    queryFn: () => orderService.getBalances(account as Account, network, tokens),
    enabled: Boolean(account) && orderService.isSupported(network) && tokens.length > 0,
  });
};
