import { renderHook, waitFor } from '@testing-library/react-native';

import { ChartRange } from '../../../src/domain/market';
import { ChainFamily } from '../../../src/domain/network';
import { Token, TokenType } from '../../../src/domain/token';
import { useMarketDataQuery, useTokenInfoQuery } from '../../../src/queries/market.queries';
import { queryKeys } from '../../../src/queries/query-keys';
import { createWrapper, NETWORK } from '../../helpers/query-wrapper';

const TOKEN: Token = { id: 'ugnot', networkId: NETWORK.id, family: ChainFamily.GNO, type: TokenType.NATIVE, name: 'Gno', symbol: 'GNOT', decimals: 6, isNative: true };

describe('useMarketDataQuery', () => {
  it('loads market data for the token and range', async () => {
    const data = { tokenId: 'ugnot', range: ChartRange.ONE_DAY };
    const marketDataService = { getMarketData: jest.fn().mockResolvedValue(data) };
    const { Wrapper, client } = createWrapper({ marketDataService });
    const { result } = await renderHook(() => useMarketDataQuery(TOKEN, NETWORK, ChartRange.ONE_DAY), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBe(data));
    expect(marketDataService.getMarketData).toHaveBeenCalledWith(TOKEN, NETWORK, '1D');
    expect(client.getQueryData(queryKeys.marketData(NETWORK.id, 'ugnot', '1D'))).toBe(data);
  });

  it('keeps the previous range data while the next range loads', async () => {
    let resolveWeek: (value: unknown) => void = () => {};
    const marketDataService = {
      getMarketData: jest.fn()
        .mockResolvedValueOnce({ range: '1D' })
        .mockImplementationOnce(() => new Promise((resolve) => {
          resolveWeek = resolve;
        })),
    };
    const { Wrapper } = createWrapper({ marketDataService });
    const { result, rerender } = await renderHook(({ range }: { range: ChartRange }) => useMarketDataQuery(TOKEN, NETWORK, range), { wrapper: Wrapper, initialProps: { range: ChartRange.ONE_DAY as ChartRange } });

    await waitFor(() => expect(result.current.data).toEqual({ range: '1D' }));
    await rerender({ range: ChartRange.ONE_WEEK });
    await waitFor(() => expect(marketDataService.getMarketData).toHaveBeenCalledTimes(2));
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data).toEqual({ range: '1D' });
    resolveWeek({ range: '1W' });
    await waitFor(() => expect(result.current.data).toEqual({ range: '1W' }));
  });

  it('does not show another token\'s data while the next token loads', async () => {
    const OTHER: Token = { ...TOKEN, id: 'gno.land/r/gnoswap/gns', symbol: 'GNS', isNative: false, type: TokenType.GRC20 };
    const marketDataService = {
      getMarketData: jest.fn()
        .mockResolvedValueOnce({ tokenId: 'ugnot' })
        .mockImplementationOnce(() => new Promise(() => undefined)),
    };
    const { Wrapper } = createWrapper({ marketDataService });
    const { result, rerender } = await renderHook(({ token }: { token: Token }) => useMarketDataQuery(token, NETWORK, ChartRange.ONE_DAY), { wrapper: Wrapper, initialProps: { token: TOKEN } });

    await waitFor(() => expect(result.current.data).toEqual({ tokenId: 'ugnot' }));
    await rerender({ token: OTHER });
    await waitFor(() => expect(marketDataService.getMarketData).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('stays idle without a token', async () => {
    const marketDataService = { getMarketData: jest.fn() };
    const { Wrapper, client } = createWrapper({ marketDataService });
    const { result } = await renderHook(() => useMarketDataQuery(undefined, NETWORK, ChartRange.ONE_DAY), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(marketDataService.getMarketData).not.toHaveBeenCalled();
    expect(client.getQueryCache().find({ queryKey: queryKeys.marketData(NETWORK.id, 'none', '1D') })).toBeDefined();
  });
});

describe('useTokenInfoQuery', () => {
  it('loads token info once per token, independent of the chart range', async () => {
    const info = { tokenId: 'ugnot', stats: {}, links: [] };
    const marketDataService = { getTokenInfo: jest.fn().mockResolvedValue(info) };
    const { Wrapper, client } = createWrapper({ marketDataService });
    const { result } = await renderHook(() => useTokenInfoQuery(TOKEN, NETWORK), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBe(info));
    expect(marketDataService.getTokenInfo).toHaveBeenCalledWith(TOKEN, NETWORK);
    expect(client.getQueryData(queryKeys.tokenInfo(NETWORK.id, 'ugnot'))).toBe(info);
  });
});
