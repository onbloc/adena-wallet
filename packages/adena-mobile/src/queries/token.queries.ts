import { InfiniteData, Query, QueryKey, useInfiniteQuery, UseInfiniteQueryResult, useQuery, UseQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { ManagedToken, Token } from '../domain/token';
import { RegistryPage } from '../repositories/chain/asset-repository';
import { TokenPriceMap } from '../services/price.service';
import { NO_ID_KEY, queryKeys } from './query-keys';

const BALANCE_POLL_MS = 10_000;
const PRICE_POLL_MS = 30_000;
const REGISTRY_PAGE_SIZE = 50;

// Keeps the previous data while the token set changes, but only within the same scope (network/account) key segments.
const keepWithinScope = <T>(queryKey: QueryKey, scopeLength: number) =>
  (previous: T | undefined, previousQuery: Query<T, Error, T, QueryKey> | undefined): T | undefined => {
    const sameScope = queryKey.slice(0, scopeLength).every((part, index) => previousQuery?.queryKey[index] === part);

    return sameScope ? previous : undefined;
  };

export const useTokenListQuery = (account: Account | null, network: Network): UseQueryResult<ManagedToken[], Error> => {
  const { tokenService } = useContainer();

  return useQuery({
    queryKey: queryKeys.tokenList(network.id, account?.id ?? NO_ID_KEY),
    queryFn: () => tokenService.getTokenList(account as Account, network),
    enabled: Boolean(account),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
};

export const useTokenBalancesQuery = (account: Account | null, network: Network, tokens: Token[]): UseQueryResult<Record<string, string>, Error> => {
  const { tokenService } = useContainer();

  const queryKey = queryKeys.tokenBalances(network.id, account?.id ?? NO_ID_KEY, tokens.map(token => token.id));

  return useQuery({
    queryKey,
    queryFn: () => tokenService.getBalances(account as Account, network, tokens),
    enabled: Boolean(account) && tokens.length > 0,
    placeholderData: keepWithinScope<Record<string, string>>(queryKey, queryKey.length - 1),
    refetchInterval: BALANCE_POLL_MS,
  });
};

export const useTokenPricesQuery = (network: Network, tokens: Token[]): UseQueryResult<TokenPriceMap, Error> => {
  const { priceService } = useContainer();

  const queryKey = queryKeys.prices(network.id, tokens.map(token => token.id));

  return useQuery({
    queryKey,
    queryFn: () => priceService.getPrices(tokens, network),
    enabled: priceService.isSupported(network) && tokens.length > 0,
    placeholderData: keepWithinScope<TokenPriceMap>(queryKey, queryKey.length - 1),
    refetchInterval: PRICE_POLL_MS,
  });
};

export const useTokenRegistryQuery = (network: Network): UseInfiniteQueryResult<InfiniteData<RegistryPage, unknown>, Error> => {
  const { tokenService } = useContainer();

  return useInfiniteQuery({
    queryKey: queryKeys.tokenSearch(network.id),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => tokenService.searchRegistry(network, pageParam, REGISTRY_PAGE_SIZE),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.length * REGISTRY_PAGE_SIZE;

      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 5 * 60_000,
  });
};
