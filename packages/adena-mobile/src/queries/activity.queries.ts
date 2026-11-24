import { InfiniteData, useInfiniteQuery, UseInfiniteQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { Activity, ActivityFilter, ActivityFilterKind } from '../domain/activity';
import { Network } from '../domain/network';
import { Page } from '../domain/nft';
import { NO_ID_KEY, queryKeys } from './query-keys';

const filterKey = (filter: ActivityFilter): string => (filter.kind === ActivityFilterKind.GRC20 ? `grc20:${filter.tokenId}` : filter.kind);

export const useActivitiesQuery = (account: Account | null, network: Network, filter: ActivityFilter): UseInfiniteQueryResult<InfiniteData<Page<Activity>, unknown>, Error> => {
  const { activityService } = useContainer();

  return useInfiniteQuery({
    queryKey: queryKeys.activities(network.id, account?.id ?? NO_ID_KEY, filterKey(filter)),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => activityService.getActivities(account as Account, network, filter, pageParam),
    getNextPageParam: page => (page.hasNext ? page.cursor : undefined),
    enabled: Boolean(account) && activityService.isSupported(network),
    refetchInterval: 15_000,
  });
};
