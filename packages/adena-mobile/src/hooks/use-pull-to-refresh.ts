import { useCallback, useState } from 'react';

// Spinner state for user pulls only. Binding RefreshControl to a query's background
// refetch makes iOS pull the list down on every poll.
export interface UsePullToRefreshReturn {
  refreshing: boolean;
  onRefresh: () => void;
}

export const usePullToRefresh = (refresh: () => Promise<unknown>): UsePullToRefreshReturn => {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh().catch(() => undefined).finally(() => setRefreshing(false));
  }, [refresh]);

  return { refreshing, onRefresh };
};
