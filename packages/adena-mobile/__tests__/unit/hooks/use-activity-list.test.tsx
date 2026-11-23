import { act, renderHook } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';

import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { ActivityFilterKind } from '../../../src/domain/activity';
import { useActivityList } from '../../../src/hooks/use-activity-list';
import { groupActivities } from '../../../src/presenters/activity.presenter';
import { useActivitiesQuery } from '../../../src/queries/activity.queries';

jest.mock('../../../src/hooks/use-wallet-snapshot', () => ({ useWalletSnapshot: () => ({ account: { id: 'acc' }, network: { id: 'net' } }) }));
jest.mock('../../../src/queries/activity.queries', () => ({ useActivitiesQuery: jest.fn() }));
jest.mock('../../../src/presenters/activity.presenter', () => ({
  groupActivities: jest.fn(() => []),
  toActivitySectionViews: jest.fn(() => [{ title: 'Today', items: [] }]),
}));

const filter = { kind: ActivityFilterKind.ALL } as const;

const query = (overrides: object = {}) => ({
  data: undefined,
  error: null,
  isPending: false,
  fetchStatus: 'idle',
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefetching: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn().mockResolvedValue('refetched'),
  ...overrides,
});

describe('useActivityList', () => {
  const isSupported = jest.fn(() => true);
  const container = { activityService: { isSupported } } as unknown as AppContainer;
  const wrapper = ({ children }: PropsWithChildren) => <ContainerProvider container={container}>{children}</ContainerProvider>;

  beforeEach(() => jest.clearAllMocks());

  it('is loading only while a pending query is fetching', async () => {
    (useActivitiesQuery as jest.Mock).mockReturnValue(query({ isPending: true, fetchStatus: 'fetching' }));
    const { result, rerender } = await renderHook(() => useActivityList(filter, [], jest.fn()), { wrapper });

    expect(result.current.listProps).toMatchObject({ loading: true, hasMore: false, supported: true, error: undefined });
    expect(groupActivities).toHaveBeenCalledWith([], []);

    (useActivitiesQuery as jest.Mock).mockReturnValue(query({ isPending: true, fetchStatus: 'idle' }));
    await rerender(undefined);
    expect(result.current.listProps.loading).toBe(false);
  });

  it('flattens pages, opens known hashes and loads more', async () => {
    const activities = [{ hash: 'h1' }, { hash: 'h2' }];
    const q = query({ data: { pages: [{ items: [activities[0]] }, { items: [activities[1]] }] }, hasNextPage: true, isFetchingNextPage: true, isRefetching: true });
    const onOpen = jest.fn();

    (useActivitiesQuery as jest.Mock).mockReturnValue(q);
    const { result } = await renderHook(() => useActivityList(filter, [], onOpen), { wrapper });

    expect(groupActivities).toHaveBeenCalledWith(activities, []);
    expect(result.current.listProps).toMatchObject({ sections: [{ title: 'Today', items: [] }], hasMore: true, loadingMore: true });
    expect(result.current.refreshing).toBe(true);
    result.current.listProps.onOpen('h2');
    result.current.listProps.onOpen('missing');
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(activities[1]);
    result.current.listProps.onLoadMore();
    expect(q.fetchNextPage).toHaveBeenCalled();
    await act(async () => {
      await expect(result.current.refetch()).resolves.toBe('refetched');
    });
  });

  it('surfaces errors and unsupported networks', async () => {
    isSupported.mockReturnValueOnce(false);
    (useActivitiesQuery as jest.Mock).mockReturnValue(query({ error: new Error('indexer down') }));
    const { result } = await renderHook(() => useActivityList(filter, [], jest.fn()), { wrapper });

    expect(result.current.listProps).toMatchObject({ supported: false, error: 'indexer down' });
  });
});
