import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ChainFamily } from '../../../src/domain/network';
import { Token, TokenType } from '../../../src/domain/token';
import { queryKeys } from '../../../src/queries/query-keys';
import { useTokenBalancesQuery, useTokenListQuery, useTokenPricesQuery, useTokenRegistryQuery } from '../../../src/queries/token.queries';
import { ACCOUNT, createWrapper, NETWORK } from '../../helpers/query-wrapper';

const token = (id: string): Token => ({ id, networkId: NETWORK.id, family: ChainFamily.GNO, type: TokenType.GRC20, name: id, symbol: id.toUpperCase(), decimals: 6, isNative: false });
const TOKENS = [token('a'), token('b')];

describe('useTokenListQuery', () => {
  it('loads the managed token list', async () => {
    const tokenService = { getTokenList: jest.fn().mockResolvedValue(TOKENS) };
    const { Wrapper } = createWrapper({ tokenService });
    const { result } = await renderHook(() => useTokenListQuery(ACCOUNT, NETWORK), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBe(TOKENS));
    expect(tokenService.getTokenList).toHaveBeenCalledWith(ACCOUNT, NETWORK);
  });

  it('stays idle without an account', async () => {
    const tokenService = { getTokenList: jest.fn() };
    const { Wrapper, client } = createWrapper({ tokenService });

    await renderHook(() => useTokenListQuery(null, NETWORK), { wrapper: Wrapper });
    expect(tokenService.getTokenList).not.toHaveBeenCalled();
    expect(client.getQueryCache().find({ queryKey: queryKeys.tokenList(NETWORK.id, 'none') })).toBeDefined();
  });
});

describe('useTokenBalancesQuery', () => {
  it('loads balances keyed by the token ids', async () => {
    const tokenService = { getBalances: jest.fn().mockResolvedValue({ a: '1' }) };
    const { Wrapper, client } = createWrapper({ tokenService });
    const { result } = await renderHook(() => useTokenBalancesQuery(ACCOUNT, NETWORK, TOKENS), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ a: '1' }));
    expect(tokenService.getBalances).toHaveBeenCalledWith(ACCOUNT, NETWORK, TOKENS);
    expect(client.getQueryData(queryKeys.tokenBalances(NETWORK.id, ACCOUNT.id, ['a', 'b']))).toEqual({ a: '1' });
  });

  it('stays idle without an account or tokens', async () => {
    const tokenService = { getBalances: jest.fn() };
    const { Wrapper } = createWrapper({ tokenService });

    await renderHook(() => useTokenBalancesQuery(null, NETWORK, TOKENS), { wrapper: Wrapper });
    await renderHook(() => useTokenBalancesQuery(ACCOUNT, NETWORK, []), { wrapper: Wrapper });
    expect(tokenService.getBalances).not.toHaveBeenCalled();
  });
});

describe('useTokenPricesQuery', () => {
  it('loads prices on supported networks', async () => {
    const priceService = { isSupported: jest.fn().mockReturnValue(true), getPrices: jest.fn().mockResolvedValue({ 'a:gno-test': { usd: 1 } }) };
    const { Wrapper } = createWrapper({ priceService });
    const { result } = await renderHook(() => useTokenPricesQuery(NETWORK, TOKENS), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ 'a:gno-test': { usd: 1 } }));
    expect(priceService.getPrices).toHaveBeenCalledWith(TOKENS, NETWORK);
  });

  it('stays idle on unsupported networks or without tokens', async () => {
    const unsupported = { isSupported: jest.fn().mockReturnValue(false), getPrices: jest.fn() };
    const supported = { isSupported: jest.fn().mockReturnValue(true), getPrices: jest.fn() };

    await renderHook(() => useTokenPricesQuery(NETWORK, TOKENS), { wrapper: createWrapper({ priceService: unsupported }).Wrapper });
    await renderHook(() => useTokenPricesQuery(NETWORK, []), { wrapper: createWrapper({ priceService: supported }).Wrapper });
    expect(unsupported.getPrices).not.toHaveBeenCalled();
    expect(supported.getPrices).not.toHaveBeenCalled();
  });
});

describe('useTokenRegistryQuery', () => {
  it('pages by offset until the total is loaded', async () => {
    const page = (count: number) => Array.from({ length: count }, (_, index) => token(`t${index}`));
    const tokenService = {
      searchRegistry: jest.fn()
        .mockResolvedValueOnce({ tokens: page(50), total: 70 })
        .mockResolvedValueOnce({ tokens: page(20), total: 70 }),
    };
    const { Wrapper } = createWrapper({ tokenService });
    const { result } = await renderHook(() => useTokenRegistryQuery(NETWORK), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(tokenService.searchRegistry).toHaveBeenLastCalledWith(NETWORK, 0, 50);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(tokenService.searchRegistry).toHaveBeenLastCalledWith(NETWORK, 50, 50);
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it('has no next page for an empty registry', async () => {
    const tokenService = { searchRegistry: jest.fn().mockResolvedValue({ tokens: [], total: 0 }) };
    const { Wrapper } = createWrapper({ tokenService });
    const { result } = await renderHook(() => useTokenRegistryQuery(NETWORK), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});
