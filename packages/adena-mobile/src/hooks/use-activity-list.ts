import { useMemo } from 'react';

import { ActivityListProps } from '../components/molecules';
import { toErrorMessage } from '../core/error-message';
import { useContainer } from '../di/container-provider';
import { Activity, ActivityFilter } from '../domain/activity';
import { Token } from '../domain/token';
import { groupActivities, toActivitySectionViews } from '../presenters/activity.presenter';
import { useActivitiesQuery } from '../queries/activity.queries';
import { useWalletSnapshot } from './use-wallet-snapshot';

// Paged activity for the current account/network, ready for ActivityList.
export interface UseActivityListReturn {
  listProps: ActivityListProps;
  refreshing: boolean;
  refetch: () => Promise<unknown>;
}

export const useActivityList = (filter: ActivityFilter, tokens: Token[], onOpen: (activity: Activity) => void): UseActivityListReturn => {
  const { activityService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const query = useActivitiesQuery(account, network, filter);
  const activities = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
  const sections = useMemo(() => toActivitySectionViews(groupActivities(activities, tokens)), [activities, tokens]);

  const listProps: ActivityListProps = {
    sections,
    supported: activityService.isSupported(network),
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.error ? toErrorMessage(query.error) : undefined,
    hasMore: Boolean(query.hasNextPage),
    loadingMore: query.isFetchingNextPage,
    onLoadMore: () => query.fetchNextPage(),
    onOpen: (hash) => {
      const activity = activities.find(item => item.hash === hash);

      if (activity) {
        onOpen(activity);
      }
    },
  };

  return { listProps, refreshing: query.isRefetching, refetch: (): Promise<unknown> => query.refetch() };
};
