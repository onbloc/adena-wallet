import { useCurrentAccount } from '@hooks/use-current-account';
import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TransactionInfo, TransactionWithPageInfo } from '@types';
import React from 'react';

import type { TransactionHistoryResult } from './types';
import { useTransactionHistory } from './use-transaction-history';
import { useTransactionHistoryPage } from './use-transaction-history-page';

const { fetchAllTransactionHistory } = vi.hoisted(() => ({
  fetchAllTransactionHistory: vi.fn(),
}));

vi.mock('@hooks/use-context', () => ({
  useAdenaContext: vi.fn().mockReturnValue({
    transactionHistoryService: { supported: true, supportedApi: true, fetchAllTransactionHistory },
  }),
}));
vi.mock('@hooks/use-current-account', () => ({
  useCurrentAccount: vi.fn().mockReturnValue({ currentAddress: 'g1account' }),
}));
vi.mock('@hooks/use-network', () => ({
  useNetwork: vi.fn().mockReturnValue({ currentNetwork: { networkId: 'test', chainId: 'test' } }),
}));
vi.mock('@hooks/use-token-metainfo', () => ({
  useTokenMetainfo: vi.fn().mockReturnValue({
    tokenMetainfos: [{}],
    allTokenMetainfos: [],
    tokenLogoMap: {},
    getTokenAmount: (amount: unknown) => amount,
  }),
}));
vi.mock('@hooks/use-grc20-tokens', () => ({
  useGRC20Tokens: vi.fn().mockReturnValue({ isFetched: true }),
}));
vi.mock('@hooks/nft/use-get-all-grc721-collections', () => ({
  useGetAllGRC721Collections: vi.fn().mockReturnValue({ data: [], isFetched: true }),
}));

function makeTransaction(hash: string): TransactionInfo {
  return {
    hash,
    height: 1,
    logo: '',
    type: 'TRANSFER',
    status: 'SUCCESS',
    title: 'Send',
    amount: { value: '1', denom: 'GNOT' },
    valueType: 'DEFAULT',
    date: '2024-01-01T00:00:00Z',
  };
}

function makePage(...hashes: string[]): TransactionWithPageInfo {
  return {
    transactions: hashes.map(makeTransaction),
    page: { hasNext: false, cursor: null },
  };
}

function hashesOf(data: TransactionHistoryResult['data']): string[] {
  return (data || []).flatMap(group => group.transactions.map(transaction => transaction.hash));
}

function makeWrapper(): React.FC<React.PropsWithChildren<unknown>> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const Wrapper: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe('useTransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAllTransactionHistory.mockReset();
  });

  it('reports a fetch error while post-processing has no transactions', async () => {
    fetchAllTransactionHistory.mockRejectedValue(new Error('History unavailable'));
    const { result } = renderHook(() => useTransactionHistory({ enabled: true }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it.each([
    ['useTransactionHistory', useTransactionHistory],
    ['useTransactionHistoryPage', useTransactionHistoryPage],
  ] as const)(
    '%s does not report fetching during a background refetch with cached data',
    async (_name, useHistory) => {
      const page = { transactions: [], page: { hasNext: false, cursor: null } };
      fetchAllTransactionHistory.mockResolvedValue(page);
      const { result } = renderHook(() => ({
        ...useHistory({ enabled: true }),
        activeRequests: useIsFetching(),
      }), {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(result.current.status).toBe('success'));
      await waitFor(() => expect(result.current.isFetching).toBe(false));
      const previousData = result.current.data;

      let finishRefetch!: (value: typeof page) => void;
      fetchAllTransactionHistory.mockReturnValueOnce(new Promise((resolve) => {
        finishRefetch = resolve;
      }));
      await act(async () => result.current.refetch());
      await waitFor(() => expect(result.current.activeRequests).toBe(1));
      expect(fetchAllTransactionHistory).toHaveBeenCalledTimes(2);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(previousData);

      await act(async () => finishRefetch(page));
    },
  );

  it('reports fetching while the next history page is pending', async () => {
    const page = { transactions: [], page: { hasNext: true, cursor: 'next' } };
    fetchAllTransactionHistory.mockResolvedValue(page);
    const { result } = renderHook(() => useTransactionHistoryPage({ enabled: true }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    let finishNextPage!: (value: typeof page) => void;
    fetchAllTransactionHistory.mockReturnValueOnce(new Promise((resolve) => {
      finishNextPage = resolve;
    }));
    let nextPage!: Promise<boolean>;
    act(() => {
      nextPage = result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(fetchAllTransactionHistory).toHaveBeenLastCalledWith('g1account', 'next');

    await act(async () => {
      finishNextPage(page);
      expect(await nextPage).toBe(true);
    });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });

  it('keeps success and existing data after a refetch fails', async () => {
    fetchAllTransactionHistory.mockResolvedValue({ transactions: [] });
    const { result } = renderHook(() => ({
      ...useTransactionHistory({ enabled: true }),
      activeRequests: useIsFetching(),
    }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    const previousData = result.current.data;

    let failRefetch!: (error: Error) => void;
    fetchAllTransactionHistory.mockReturnValueOnce(new Promise((_resolve, reject) => {
      failRefetch = reject;
    }));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.activeRequests).toBe(1));

    await act(async () => failRefetch(new Error('Polling failed')));
    await waitFor(() => expect(result.current.activeRequests).toBe(0));
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(previousData);
  });

  it('reports error and clears data when the address changes and the new fetch fails', async () => {
    fetchAllTransactionHistory.mockResolvedValue({ transactions: [] });
    const { result, rerender } = renderHook(() => ({
      ...useTransactionHistory({ enabled: true }),
      activeRequests: useIsFetching(),
    }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual([]);
    const currentAccount = useCurrentAccount();

    let failFetch!: (error: Error) => void;
    fetchAllTransactionHistory.mockReturnValueOnce(new Promise((_resolve, reject) => {
      failFetch = reject;
    }));

    await vi.mocked(useCurrentAccount).withImplementation(
      () => ({ ...currentAccount, currentAddress: 'g1otheraccount' }),
      async () => {
        rerender();
        await waitFor(() => expect(result.current.activeRequests).toBe(1));
        expect(fetchAllTransactionHistory).toHaveBeenLastCalledWith('g1otheraccount');
        expect(result.current.data).toBeNull();

        await act(async () => failFetch(new Error('New account history unavailable')));
        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.data).toBeNull();
      },
    );
  });

  it.each([
    ['useTransactionHistory', useTransactionHistory],
    ['useTransactionHistoryPage', useTransactionHistoryPage],
  ] as const)(
    '%s does not show the previous account rows while the new account is loading',
    async (_name, useHistory) => {
      fetchAllTransactionHistory.mockResolvedValue(makePage('tx-a'));
      const { result, rerender } = renderHook(() => ({
        ...useHistory({ enabled: true }),
        activeRequests: useIsFetching(),
      }), {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(result.current.status).toBe('success'));
      await waitFor(() => expect(hashesOf(result.current.data)).toEqual(['tx-a']));
      const currentAccount = useCurrentAccount();

      let finishFetch!: (value: TransactionWithPageInfo) => void;
      fetchAllTransactionHistory.mockReturnValueOnce(new Promise((resolve) => {
        finishFetch = resolve;
      }));

      await vi.mocked(useCurrentAccount).withImplementation(
        () => ({ ...currentAccount, currentAddress: 'g1otheraccount' }),
        async () => {
          rerender();
          await waitFor(() => expect(result.current.activeRequests).toBe(1));
          expect(fetchAllTransactionHistory.mock.lastCall?.[0]).toBe('g1otheraccount');
          expect(result.current.status).toBe('loading');
          expect(result.current.data).toBeNull();

          await act(async () => finishFetch(makePage('tx-b')));
          await waitFor(() => expect(result.current.status).toBe('success'));
          await waitFor(() => expect(hashesOf(result.current.data)).toEqual(['tx-b']));
        },
      );
    },
  );

  it.each([
    ['useTransactionHistory', useTransactionHistory],
    ['useTransactionHistoryPage', useTransactionHistoryPage],
  ] as const)(
    '%s keeps the same account rows while a refetch with a new transaction is processed',
    async (_name, useHistory) => {
      fetchAllTransactionHistory.mockResolvedValue(makePage('tx-a'));
      const renderedRows: string[][] = [];
      const { result } = renderHook(() => {
        const history = useHistory({ enabled: true });
        renderedRows.push(hashesOf(history.data));
        return { ...history, activeRequests: useIsFetching() };
      }, {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(hashesOf(result.current.data)).toEqual(['tx-a']));
      await waitFor(() => expect(result.current.isFetching).toBe(false));

      let finishRefetch!: (value: TransactionWithPageInfo) => void;
      fetchAllTransactionHistory.mockReturnValueOnce(new Promise((resolve) => {
        finishRefetch = resolve;
      }));
      await act(async () => result.current.refetch());
      await waitFor(() => expect(result.current.activeRequests).toBe(1));
      expect(result.current.status).toBe('success');
      expect(hashesOf(result.current.data)).toEqual(['tx-a']);

      const firstRefetchRender = renderedRows.length;
      await act(async () => finishRefetch(makePage('tx-new', 'tx-a')));
      await waitFor(() => expect(hashesOf(result.current.data)).toEqual(['tx-new', 'tx-a']));
      expect(result.current.status).toBe('success');
      expect(renderedRows.slice(firstRefetchRender)).not.toContainEqual([]);
    },
  );
});
