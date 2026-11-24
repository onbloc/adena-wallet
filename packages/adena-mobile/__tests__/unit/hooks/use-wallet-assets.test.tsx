import { act, renderHook } from '@testing-library/react-native';

import { useWalletAssets } from '../../../src/hooks/use-wallet-assets';
import { buildAssetViews } from '../../../src/presenters/asset.presenter';
import { useTokenBalancesQuery, useTokenListQuery, useTokenPricesQuery } from '../../../src/queries/token.queries';
import { PriceService } from '../../../src/services/price.service';

jest.mock('../../../src/hooks/use-wallet-snapshot', () => ({ useWalletSnapshot: () => ({ account: { id: 'acc' }, network: { id: 'net' } }) }));
jest.mock('../../../src/queries/token.queries', () => ({
  useTokenListQuery: jest.fn(),
  useTokenBalancesQuery: jest.fn(),
  useTokenPricesQuery: jest.fn(),
}));
jest.mock('../../../src/presenters/asset.presenter', () => ({ buildAssetViews: jest.fn(() => [{ key: 'view' }]) }));
jest.mock('../../../src/services/price.service', () => ({ PriceService: { portfolio: jest.fn(() => ({ totalUsd: 1 })) } }));

const query = (overrides: object = {}) => ({
  data: undefined,
  error: null,
  isPending: false,
  isRefetching: false,
  refetch: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const visible = { id: 'ugnot', visible: true };
const hidden = { id: 'hidden', visible: false };

describe('useWalletAssets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is loading with no data', async () => {
    const list = query({ isPending: true });
    const balances = query({ isPending: true });

    (useTokenListQuery as jest.Mock).mockReturnValue(list);
    (useTokenBalancesQuery as jest.Mock).mockReturnValue(balances);
    (useTokenPricesQuery as jest.Mock).mockReturnValue(query());
    const { result } = await renderHook(() => useWalletAssets());

    expect(result.current).toMatchObject({ tokens: [], allTokens: [], portfolio: null, loading: true, refreshing: false, error: null });
    expect(buildAssetViews).toHaveBeenCalledWith([], undefined, undefined, true);
  });

  it('filters visible tokens, values the portfolio and refetches in order', async () => {
    const order: string[] = [];
    const list = query({ data: [visible, hidden], refetch: jest.fn(async () => order.push('list')) });
    const balances = query({ data: { ugnot: '100' }, isRefetching: true, refetch: jest.fn(async () => order.push('balances')) });
    const prices = query({ data: { ugnot: { usd: 1 } }, refetch: jest.fn(async () => order.push('prices')) });

    (useTokenListQuery as jest.Mock).mockReturnValue(list);
    (useTokenBalancesQuery as jest.Mock).mockReturnValue(balances);
    (useTokenPricesQuery as jest.Mock).mockReturnValue(prices);
    const { result } = await renderHook(() => useWalletAssets());

    expect(result.current.tokens).toEqual([visible]);
    expect(result.current.allTokens).toEqual([visible, hidden]);
    expect(result.current.assets).toEqual([{ key: 'view' }]);
    expect(result.current.portfolio).toEqual({ totalUsd: 1 });
    expect(result.current.refreshing).toBe(true);
    expect(PriceService.portfolio).toHaveBeenCalledWith([{ token: visible, amount: '100' }], prices.data);
    await act(async () => result.current.refetch());
    expect(order[0]).toBe('list');
    expect(order.slice(1).sort()).toEqual(['balances', 'prices']);
  });

  it('reports the token list error first, then the balance error', async () => {
    (useTokenListQuery as jest.Mock).mockReturnValue(query({ error: new Error('list'), isRefetching: true }));
    (useTokenBalancesQuery as jest.Mock).mockReturnValue(query({ error: new Error('balances'), data: { ugnot: '1' } }));
    (useTokenPricesQuery as jest.Mock).mockReturnValue(query());
    const { result, rerender } = await renderHook(() => useWalletAssets());

    expect(result.current.error?.message).toBe('list');
    expect(result.current.refreshing).toBe(true);
    expect(result.current.portfolio).toBeNull();

    (useTokenListQuery as jest.Mock).mockReturnValue(query());
    await rerender(undefined);
    expect(result.current.error?.message).toBe('balances');
  });
});
