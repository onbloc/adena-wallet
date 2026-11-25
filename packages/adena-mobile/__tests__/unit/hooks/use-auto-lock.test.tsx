import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { APP_CONFIG } from '../../../src/config/app';
import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { useAutoLock } from '../../../src/hooks/use-auto-lock';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';

describe('useAutoLock', () => {
  let listener: (state: AppStateStatus) => void;
  const remove = jest.fn();
  const lock = jest.fn();
  let client: QueryClient;

  const setup = () => {
    const container = { walletService: { lock } } as unknown as AppContainer;

    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
    client.setQueryData(['secret'], 'cached');
    const wrapper = ({ children }: PropsWithChildren) => (
      <ContainerProvider container={container}><QueryClientProvider client={client}>{children}</QueryClientProvider></ContainerProvider>
    );

    return renderHook(() => useAutoLock(), { wrapper });
  };

  const changeAppState = (state: AppStateStatus) => act(async () => listener(state));

  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000_000 });
    lock.mockClear();
    remove.mockClear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as (state: AppStateStatus) => void;

      return { remove } as never;
    });
    useSessionStore.setState({ status: SessionStatus.UNLOCKED });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('locks after the idle window and clears cached queries', async () => {
    await setup();
    await act(async () => {
      jest.advanceTimersByTime(APP_CONFIG.autoLockMs - 15_000);
    });
    expect(lock).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });
    expect(lock).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED);
    expect(client.getQueryData(['secret'])).toBeUndefined();
  });

  it('postpones the lock on every touch', async () => {
    const { result } = await setup();

    await act(async () => {
      jest.advanceTimersByTime(APP_CONFIG.autoLockMs - 30_000);
    });
    await act(async () => result.current());
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(lock).not.toHaveBeenCalled();
  });

  it('does not run the idle timer while locked', async () => {
    useSessionStore.setState({ status: SessionStatus.LOCKED });
    await setup();
    await act(async () => {
      jest.advanceTimersByTime(APP_CONFIG.autoLockMs * 2);
    });
    expect(lock).not.toHaveBeenCalled();
  });

  it('locks on return from a long background stay', async () => {
    await setup();
    await changeAppState('background');
    jest.setSystemTime(Date.now() + APP_CONFIG.autoLockMs);
    await changeAppState('active');
    expect(lock).toHaveBeenCalledTimes(1);
  });

  it('stays unlocked after a short background stay', async () => {
    await setup();
    await changeAppState('background');
    jest.setSystemTime(Date.now() + 1000);
    await changeAppState('inactive');
    await changeAppState('active');
    expect(lock).not.toHaveBeenCalled();
  });

  it('counts the idle time before a short background stay', async () => {
    await setup();
    await act(async () => {
      jest.advanceTimersByTime(APP_CONFIG.autoLockMs - 30_000);
    });
    await changeAppState('background');
    jest.setSystemTime(Date.now() + 30_000);
    await changeAppState('active');
    expect(lock).toHaveBeenCalledTimes(1);
  });

  it('keeps the remaining idle time after a short background stay', async () => {
    await setup();
    await act(async () => {
      jest.advanceTimersByTime(APP_CONFIG.autoLockMs - 60_000);
    });
    await changeAppState('background');
    jest.setSystemTime(Date.now() + 1000);
    await changeAppState('active');
    expect(lock).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(lock).toHaveBeenCalledTimes(1);
  });

  it('locks when the clock moved backwards while backgrounded', async () => {
    await setup();
    await changeAppState('background');
    jest.setSystemTime(Date.now() - 1000);
    await changeAppState('active');
    expect(lock).toHaveBeenCalledTimes(1);
  });

  it('ignores activation without a prior background event and when already locked', async () => {
    await setup();
    await changeAppState('active');
    await act(async () => useSessionStore.setState({ status: SessionStatus.EMPTY }));
    await changeAppState('background');
    jest.setSystemTime(Date.now() + APP_CONFIG.autoLockMs * 2);
    await changeAppState('active');
    expect(lock).not.toHaveBeenCalled();
  });

  it('removes the AppState subscription on unmount', async () => {
    const { unmount } = await setup();

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
