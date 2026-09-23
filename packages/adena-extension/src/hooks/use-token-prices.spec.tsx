import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { TokenPriceMap } from '@types';
import { useAdenaContext } from './use-context';
import { useTokenPrices } from './use-token-prices';

jest.mock('./use-context', () => ({ useAdenaContext: jest.fn() }));

const REQUESTS = [{ tokenId: 'uatone', networkId: 'atomone-1' }];

const MAINNET_PRICES: TokenPriceMap = {
  'uatone:atomone-1': { tokenId: 'uatone', networkId: 'atomone-1', usd: 3.87, change24h: 1 },
};

function mockService(sourceId: string, prices: TokenPriceMap): jest.Mock {
  const getTokenPrices = jest.fn().mockResolvedValue(prices);
  (useAdenaContext as jest.Mock).mockReturnValue({
    tokenPriceService: { sourceId, getTokenPrices },
  });
  return getTokenPrices;
}

function makeWrapper(): React.FC<React.PropsWithChildren<unknown>> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe('useTokenPrices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the quotes for the requested tokens', async () => {
    mockService('https://api.onbloc.xyz', MAINNET_PRICES);

    const { result } = renderHook(() => useTokenPrices(REQUESTS), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.tokenPrices).toEqual(MAINNET_PRICES));
  });

  it('drops the previous endpoint quotes when the API source changes', async () => {
    mockService('https://api.onbloc.xyz', MAINNET_PRICES);
    const wrapper = makeWrapper();

    // Same tokens on screen throughout: only the price endpoint changes, which
    // is exactly the case a token-identity-only key could not tell apart.
    const { result, rerender } = renderHook(() => useTokenPrices(REQUESTS), { wrapper });
    await waitFor(() => expect(result.current.tokenPrices).toEqual(MAINNET_PRICES));

    // A network with no price API: nothing to quote with.
    const getTokenPrices = mockService('', {});
    rerender();

    expect(result.current.tokenPrices).toEqual({});
    expect(result.current.isFetched).toBe(false);
    await waitFor(() => expect(getTokenPrices).toHaveBeenCalled());
    expect(result.current.tokenPrices).toEqual({});
  });

  it('asks the new source immediately rather than waiting for the next poll', async () => {
    mockService('https://api.onbloc.xyz', MAINNET_PRICES);
    const wrapper = makeWrapper();

    const { result, rerender } = renderHook(() => useTokenPrices(REQUESTS), { wrapper });
    await waitFor(() => expect(result.current.tokenPrices).toEqual(MAINNET_PRICES));

    const stagingPrices: TokenPriceMap = {
      'uatone:atomone-1': { tokenId: 'uatone', networkId: 'atomone-1', usd: 1.5, change24h: null },
    };
    mockService('https://staging.api.onbloc.xyz', stagingPrices);
    rerender();

    await waitFor(() => expect(result.current.tokenPrices).toEqual(stagingPrices));
  });

  it('does not call the service with nothing on screen', () => {
    const getTokenPrices = mockService('https://api.onbloc.xyz', MAINNET_PRICES);

    const { result } = renderHook(() => useTokenPrices([]), { wrapper: makeWrapper() });

    expect(result.current.tokenPrices).toEqual({});
    expect(getTokenPrices).not.toHaveBeenCalled();
  });
});
