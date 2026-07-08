import { RefetchOptions, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { TransactionInfo, TransactionWithPageInfo } from '@types';
import { dedupeAndSortTransactions } from './session-history-source';

const REFETCH_INTERVAL = 3_000;

// API-backed (cursor paginated) transaction history. `currentAddress` already
// resolves to the SESSION address for SessionAccount, and the API attributes
// session-signed transactions to that address, so a session account queries by
// its session address exactly like any other account queries by its own —
// no local master-merge or per-tx session_addr resolution is needed.
export const useTransactionHistoryPage = ({
  enabled,
}: {
  enabled: boolean;
}): {
  data:
    | {
        title: string;
        transactions: TransactionInfo[];
      }[]
    | null;
  isFetched: boolean;
  status: 'loading' | 'error' | 'success';
  isLoading: boolean;
  isFetching: boolean;
  isSupported: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<boolean>;
  refetch: (options?: RefetchOptions) => void;
} => {
  const { currentNetwork } = useNetwork();
  const { currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();
  const { tokenMetainfos } = useTokenMetainfo();

  const {
    data: allTransactions,
    hasNextPage,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery<TransactionWithPageInfo, Error, unknown, any>(
    {
      queryKey: ['history/page/all', currentNetwork.networkId, currentAddress || ''],
      getNextPageParam: (lastPage?: TransactionWithPageInfo): string | null => {
        if (!lastPage || !lastPage.page.hasNext) {
          return null;
        }
        return lastPage.page.cursor;
      },
      queryFn: async (context: any): Promise<TransactionWithPageInfo> => {
        const cursor = (context?.pageParam as string | undefined) ?? null;
        if (!currentAddress) {
          return { page: { hasNext: false, cursor: null }, transactions: [] };
        }
        return transactionHistoryService.fetchAllTransactionHistory(currentAddress, cursor);
      },
    },
    {
      enabled:
        !!currentAddress &&
        tokenMetainfos.length > 0 &&
        transactionHistoryService.supported &&
        enabled,
      keepPreviousData: true,
      refetchInterval: REFETCH_INTERVAL,
    },
  );

  const transactions = useMemo(() => {
    if (!allTransactions) {
      return null;
    }

    const pageTransactions = allTransactions.pages.flatMap(
      (page: unknown) => (page as TransactionWithPageInfo).transactions,
    );
    return dedupeAndSortTransactions(pageTransactions);
  }, [allTransactions?.pages]);

  const firstTransactionHash = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return '';
    }

    return transactions[0]?.hash;
  }, [transactions]);

  const { data, isFetched, status, isLoading, isFetching } = useMakeTransactionsWithTime(
    `history/page/all/${currentNetwork.chainId}/${firstTransactionHash}`,
    transactions,
  );

  const refetchTransactions = (options?: RefetchOptions): void => {
    refetch(options);
  };

  return {
    data: data || null,
    isSupported: transactionHistoryService.supported && enabled,
    isFetched: isFetched,
    status,
    isLoading,
    isFetching,
    hasNextPage: hasNextPage !== false,
    fetchNextPage: (): Promise<boolean> => {
      return fetchNextPage()
        .then((result) => !result.error)
        .catch(() => false);
    },
    refetch: refetchTransactions,
  };
};
