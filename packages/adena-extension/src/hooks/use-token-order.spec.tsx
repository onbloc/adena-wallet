import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { TokenBalanceType } from '@types';
import { readTokenOrder, writeTokenOrder } from './helpers/token-order-cache';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';
import { useTokenOrder } from './use-token-order';

jest.mock('./use-current-account', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('./use-network', () => ({ useNetwork: jest.fn() }));
jest.mock('./helpers/token-order-cache', () => ({
  ...jest.requireActual('./helpers/token-order-cache'),
  readTokenOrder: jest.fn(),
  writeTokenOrder: jest.fn(),
}));

const mockedReadTokenOrder = readTokenOrder as jest.Mock;
const mockedWriteTokenOrder = writeTokenOrder as jest.Mock;

function row(tokenId: string, networkId = 'gnoland-1'): TokenBalanceType {
  return { tokenId, networkId } as TokenBalanceType;
}

function makeWrapper(): React.FC<React.PropsWithChildren<unknown>> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe('useTokenOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadTokenOrder.mockResolvedValue(null);
    mockedWriteTokenOrder.mockResolvedValue(undefined);
    (useCurrentAccount as jest.Mock).mockReturnValue({ currentAccount: { id: 'account-1' } });
    (useNetwork as jest.Mock).mockReturnValue({
      currentNetwork: { networkId: 'gnoland-1' },
      currentAtomoneNetwork: { id: 'atomone-1' },
    });
  });

  it('reads the order stored for the current account and networks', async () => {
    mockedReadTokenOrder.mockResolvedValue(['gnot:gnoland-1']);

    const { result } = renderHook(() => useTokenOrder(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.storedOrder).toEqual(['gnot:gnoland-1']));
    expect(mockedReadTokenOrder).toHaveBeenCalledWith('account-1:gnoland-1:atomone-1');
  });

  it('records an order that differs from the stored one', async () => {
    mockedReadTokenOrder.mockResolvedValue(['gnot:gnoland-1', 'foo:gnoland-1']);

    const { result } = renderHook(() => useTokenOrder(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.storedOrder).not.toBeNull());

    act(() => result.current.persistOrder([row('foo'), row('gnot')]));

    expect(mockedWriteTokenOrder).toHaveBeenCalledWith('account-1:gnoland-1:atomone-1', [
      'foo:gnoland-1',
      'gnot:gnoland-1',
    ]);
    // The new order is visible to every other screen without re-reading storage.
    await waitFor(() =>
      expect(result.current.storedOrder).toEqual(['foo:gnoland-1', 'gnot:gnoland-1']),
    );
  });

  it('does not write when the rows have not moved', async () => {
    mockedReadTokenOrder.mockResolvedValue(['gnot:gnoland-1', 'foo:gnoland-1']);

    const { result } = renderHook(() => useTokenOrder(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.storedOrder).not.toBeNull());

    act(() => result.current.persistOrder([row('gnot'), row('foo')]));

    expect(mockedWriteTokenOrder).not.toHaveBeenCalled();
  });

  it('records the first order when nothing is stored yet', async () => {
    const { result } = renderHook(() => useTokenOrder(), { wrapper: makeWrapper() });
    await waitFor(() => expect(mockedReadTokenOrder).toHaveBeenCalled());

    act(() => result.current.persistOrder([row('gnot')]));

    expect(mockedWriteTokenOrder).toHaveBeenCalledWith('account-1:gnoland-1:atomone-1', [
      'gnot:gnoland-1',
    ]);
  });

  it('scopes the order to the active AtomOne network too', async () => {
    (useNetwork as jest.Mock).mockReturnValue({
      currentNetwork: { networkId: 'gnoland-1' },
      currentAtomoneNetwork: { id: 'atomone-test' },
    });

    renderHook(() => useTokenOrder(), { wrapper: makeWrapper() });

    await waitFor(() =>
      expect(mockedReadTokenOrder).toHaveBeenCalledWith('account-1:gnoland-1:atomone-test'),
    );
  });

  it('reports the order unresolved until the read returns', async () => {
    let release: (value: string[] | null) => void = () => undefined;
    mockedReadTokenOrder.mockReturnValue(
      new Promise<string[] | null>((resolve) => {
        release = resolve;
      }),
    );

    const { result } = renderHook(() => useTokenOrder(), { wrapper: makeWrapper() });

    // Callers must not order rows on this: doing so renders a provisional
    // order that the stored one then rearranges.
    expect(result.current.isOrderResolved).toBe(false);

    act(() => release(['gnot:gnoland-1']));

    await waitFor(() => expect(result.current.isOrderResolved).toBe(true));
    expect(result.current.storedOrder).toEqual(['gnot:gnoland-1']);
  });

  it('counts a missing account as resolved, since no order can exist for it', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ currentAccount: null });

    const { result } = renderHook(() => useTokenOrder(), { wrapper: makeWrapper() });

    expect(result.current.isOrderResolved).toBe(true);
    expect(result.current.storedOrder).toBeNull();
  });

  it('stores nothing while there is no account to scope it to', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ currentAccount: null });

    const { result } = renderHook(() => useTokenOrder(), { wrapper: makeWrapper() });

    act(() => result.current.persistOrder([row('gnot')]));

    expect(mockedWriteTokenOrder).not.toHaveBeenCalled();
    expect(mockedReadTokenOrder).not.toHaveBeenCalled();
  });
});
