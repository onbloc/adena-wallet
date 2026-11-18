import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { GRC20TokenModel } from '@types';
import { useMemo } from 'react';

import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';

const GRC20_PAGE_SIZE = 50;

interface GRC20TokenPage {
  items: GRC20TokenModel[];
  totalCount: number;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useGRC20TokensInfinite = () => {
  const { tokenService } = useAdenaContext();
  const { currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  const query = useInfiniteQuery({
    queryKey: ['grc20-tokens-infinite', currentNetwork.networkId],

    queryFn: ({ pageParam }): Promise<GRC20TokenPage> =>
      tokenService.fetchGRC20TokensPaged({ offset: pageParam, limit: GRC20_PAGE_SIZE }),
    initialPageParam: 0,

    // Advance the offset by whole pages of registry keys. Items may be fewer
    // than the page size (nil/invalid entries are filtered), so paginate on the
    // registry size, not on item count.
    getNextPageParam: (lastPage, allPages): number | undefined => {
      const nextOffset = allPages.length * GRC20_PAGE_SIZE;
      return nextOffset < lastPage.totalCount ? nextOffset : undefined;
    },

    staleTime: Infinity,
    enabled: !!currentAddress,
    placeholderData: keepPreviousData,
  });

  const tokens = useMemo(
    () => query.data?.pages.flatMap(page => page.items) ?? [],
    [query.data],
  );

  return {
    tokens,
    totalCount: query.data?.pages[0]?.totalCount ?? 0,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: !!query.hasNextPage,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  };
};
