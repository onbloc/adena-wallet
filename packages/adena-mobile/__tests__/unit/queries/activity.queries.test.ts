import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ActivityFilter, ActivityFilterKind } from '../../../src/domain/activity';
import { useActivitiesQuery } from '../../../src/queries/activity.queries';
import { queryKeys } from '../../../src/queries/query-keys';
import { ACCOUNT, createWrapper, NETWORK } from '../../helpers/query-wrapper';

const ALL: ActivityFilter = { kind: ActivityFilterKind.ALL };

const service = (supported = true) => ({
  isSupported: jest.fn().mockReturnValue(supported),
  getActivities: jest.fn()
    .mockResolvedValueOnce({ items: [{ hash: 'a' }], cursor: 'c1', hasNext: true })
    .mockResolvedValueOnce({ items: [{ hash: 'b' }], cursor: null, hasNext: false }),
});

describe('useActivitiesQuery', () => {
  it('pages through activities with the cursor', async () => {
    const activityService = service();
    const { Wrapper } = createWrapper({ activityService });
    const { result } = await renderHook(() => useActivitiesQuery(ACCOUNT, NETWORK, ALL), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(activityService.getActivities).toHaveBeenLastCalledWith(ACCOUNT, NETWORK, ALL, null);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(activityService.getActivities).toHaveBeenLastCalledWith(ACCOUNT, NETWORK, ALL, 'c1');
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);
  });

  it.each([
    [{ kind: ActivityFilterKind.ALL } as ActivityFilter, 'all'],
    [{ kind: ActivityFilterKind.NATIVE, denom: 'ugnot' } as ActivityFilter, 'native'],
    [{ kind: ActivityFilterKind.GRC20, tokenId: 'foo.FOO', pkgPath: 'gno.land/r/foo' } as ActivityFilter, 'grc20:foo.FOO'],
  ])('keys the cache by filter %p', async (filter, key) => {
    const { Wrapper, client } = createWrapper({ activityService: service() });

    const { result } = await renderHook(() => useActivitiesQuery(ACCOUNT, NETWORK, filter), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryCache().find({ queryKey: queryKeys.activities(NETWORK.id, ACCOUNT.id, key) })).toBeDefined();
  });

  it('stays idle without an account', async () => {
    const activityService = service();
    const { Wrapper, client } = createWrapper({ activityService });
    const { result } = await renderHook(() => useActivitiesQuery(null, NETWORK, ALL), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(activityService.getActivities).not.toHaveBeenCalled();
    expect(client.getQueryCache().find({ queryKey: queryKeys.activities(NETWORK.id, 'none', 'all') })).toBeDefined();
  });

  it('stays idle on unsupported networks', async () => {
    const activityService = service(false);
    const { Wrapper } = createWrapper({ activityService });
    const { result } = await renderHook(() => useActivitiesQuery(ACCOUNT, NETWORK, ALL), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(activityService.isSupported).toHaveBeenCalledWith(NETWORK);
    expect(activityService.getActivities).not.toHaveBeenCalled();
  });
});
