import { act, renderHook } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';
import { Linking } from 'react-native';

import { AppError, AppErrorCode } from '../../../src/core/errors';
import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { useDeepLinkHandler } from '../../../src/hooks/use-deep-link-handler';
import { navigationRef } from '../../../src/navigation/navigation-ref';
import { MAX_QUEUED_DAPP_REQUESTS, useDappRequestStore } from '../../../src/stores/dapp-request.store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { useToastStore } from '../../../src/stores/toast.store';

const link = (id: string) => `adena://request?payload=${id}`;

describe('useDeepLinkHandler', () => {
  let urlListener: (event: { url: string }) => void;
  const remove = jest.fn();
  const parseRequestUrl = jest.fn((url: string) => ({ requestId: url }));
  let initialUrl: string | null;
  let navigate: jest.SpyInstance;

  const setup = (navigationReady = true) => {
    const container = { dappService: { parseRequestUrl } } as unknown as AppContainer;
    const wrapper = ({ children }: PropsWithChildren) => <ContainerProvider container={container}>{children}</ContainerProvider>;

    return renderHook((ready: boolean) => useDeepLinkHandler(ready), { wrapper, initialProps: navigationReady });
  };

  beforeEach(() => {
    initialUrl = null;
    remove.mockClear();
    parseRequestUrl.mockClear();
    jest.spyOn(Linking, 'getInitialURL').mockImplementation(() => Promise.resolve(initialUrl));
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, handler) => {
      urlListener = handler as (event: { url: string }) => void;

      return { remove } as never;
    });
    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
    navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => undefined);
    useDappRequestStore.setState({ queue: [], active: null, inFlight: false });
    useSessionStore.setState({ status: SessionStatus.UNLOCKED });
    useToastStore.setState({ toast: null });
  });

  afterEach(() => jest.restoreAllMocks());

  it('presents the launch link once unlocked', async () => {
    initialUrl = link('initial');
    await setup();
    await act(async () => undefined);
    expect(useDappRequestStore.getState().active).toEqual({ url: link('initial'), request: { requestId: link('initial') } });
    expect(navigate).toHaveBeenCalledWith('DappRequest');
  });

  it('ignores empty and non-dApp links', async () => {
    await setup();
    await act(async () => {
      urlListener({ url: '' });
      urlListener({ url: 'https://example.com' });
    });
    expect(useDappRequestStore.getState().queue).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('queues links while locked and presents them after unlock, one at a time', async () => {
    useSessionStore.setState({ status: SessionStatus.LOCKED });
    await setup();
    await act(async () => {
      urlListener({ url: link('a') });
      urlListener({ url: link('b') });
    });
    expect(useDappRequestStore.getState().queue).toEqual([link('a'), link('b')]);
    expect(navigate).not.toHaveBeenCalled();

    await act(async () => useSessionStore.setState({ status: SessionStatus.UNLOCKED }));
    expect(useDappRequestStore.getState().active?.url).toBe(link('a'));
    expect(useDappRequestStore.getState().queue).toEqual([link('b')]);

    await act(async () => useDappRequestStore.getState().setActive(null));
    expect(useDappRequestStore.getState().active?.url).toBe(link('b'));
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('requeues an unanswered request when the wallet locks', async () => {
    await setup();
    await act(async () => urlListener({ url: link('a') }));
    expect(useDappRequestStore.getState().active?.url).toBe(link('a'));
    await act(async () => useSessionStore.setState({ status: SessionStatus.LOCKED }));
    expect(useDappRequestStore.getState()).toMatchObject({ active: null, queue: [link('a')] });
  });

  it('keeps an in-flight request across a lock', async () => {
    await setup();
    await act(async () => urlListener({ url: link('a') }));
    await act(async () => useDappRequestStore.getState().setInFlight(true));
    await act(async () => useSessionStore.setState({ status: SessionStatus.LOCKED }));
    expect(useDappRequestStore.getState().active?.url).toBe(link('a'));
  });

  it('waits for the navigation container', async () => {
    const { rerender } = await setup(false);

    await act(async () => urlListener({ url: link('a') }));
    expect(navigate).not.toHaveBeenCalled();

    (navigationRef.isReady as jest.Mock).mockReturnValue(false);
    await rerender(true);
    expect(navigate).not.toHaveBeenCalled();

    (navigationRef.isReady as jest.Mock).mockReturnValue(true);
    await act(async () => urlListener({ url: link('b') }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('toasts when the queue is full', async () => {
    useSessionStore.setState({ status: SessionStatus.LOCKED });
    await setup();
    await act(async () => {
      for (let index = 0; index <= MAX_QUEUED_DAPP_REQUESTS; index++) {
        urlListener({ url: link(String(index)) });
      }
    });
    expect(useDappRequestStore.getState().queue).toHaveLength(MAX_QUEUED_DAPP_REQUESTS);
    expect(useToastStore.getState().toast).toMatchObject({ message: 'Too many pending requests. Try again later.', tone: 'error' });
  });

  it('toasts an invalid link instead of navigating', async () => {
    parseRequestUrl.mockImplementationOnce(() => {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'callback is missing');
    }).mockImplementationOnce(() => {
      throw 'raw';
    });
    await setup();
    await act(async () => urlListener({ url: link('bad') }));
    expect(useToastStore.getState().toast?.message).toBe('callback is missing');
    expect(useDappRequestStore.getState().active).toBeNull();
    await act(async () => urlListener({ url: link('bad2') }));
    expect(useToastStore.getState().toast?.message).toBe('Invalid request link');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing when the dequeued link vanished', async () => {
    await setup();
    const dequeue = jest.spyOn(useDappRequestStore.getState(), 'dequeue').mockReturnValue(null);

    await act(async () => useDappRequestStore.setState({ queue: [link('ghost')] }));
    expect(dequeue).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = await setup();

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
