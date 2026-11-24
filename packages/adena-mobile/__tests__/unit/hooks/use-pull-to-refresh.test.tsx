import { act, renderHook } from '@testing-library/react-native';

import { usePullToRefresh } from '../../../src/hooks/use-pull-to-refresh';

const deferred = () => {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('usePullToRefresh', () => {
  it('spins until the refresh resolves', async () => {
    const pending = deferred();
    const refresh = jest.fn(() => pending.promise);
    const { result } = await renderHook(() => usePullToRefresh(refresh));

    expect(result.current.refreshing).toBe(false);
    await act(async () => result.current.onRefresh());
    expect(result.current.refreshing).toBe(true);
    await act(async () => pending.resolve());
    expect(result.current.refreshing).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops spinning and swallows a failed refresh', async () => {
    const pending = deferred();
    const { result } = await renderHook(() => usePullToRefresh(() => pending.promise));

    await act(async () => result.current.onRefresh());
    await act(async () => pending.reject(new Error('offline')));
    expect(result.current.refreshing).toBe(false);
  });
});
