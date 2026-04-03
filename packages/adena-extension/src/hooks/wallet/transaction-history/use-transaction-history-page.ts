import {
  useAdenaContext,
} from '@hooks/use-context';
import {
  useCurrentAccount,
} from '@hooks/use-current-account';
import {
  useMakeTransactionsWithTime,
} from '@hooks/use-make-transactions-with-time';
import {
  useNetwork,
} from '@hooks/use-network';
import {
  useTokenMetainfo,
} from '@hooks/use-token-metainfo';
import {
  keepPreviousData, RefetchOptions, useInfiniteQuery,
} from '@tanstack/react-query';
import {
  TransactionInfo, TransactionWithPageInfo,
} from '@types';
import {
  useMemo,
} from 'react';

const REFETCH_INTERVAL = 3_000;

export const useTransactionHistoryPage = ({
  enabled,
}: {
  enabled: boolean
}): {
  data:
    | {
      title: string
      transactions: TransactionInfo[]
    }[]
    | null
  isFetched: boolean
  status: 'pending' | 'error' | 'success'
  isLoading: boolean
  isFetching: boolean
  isSupported: boolean
  hasNextPage: boolean
  fetchNextPage: () => Promise<boolean>
  refetch: (options?: RefetchOptions) => void
} => {
  const {
    currentNetwork,
  } = useNetwork();
  const {
    currentAddress,
  } = useCurrentAccount();
  const {
    transactionHistoryService,
  } = useAdenaContext();
  const {
    tokenMetainfos,
  } = useTokenMetainfo();

  const {
    data: allTransactions,
    hasNextPage,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['history/page/all', currentNetwork.networkId, currentAddress || ''],
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: TransactionWithPageInfo): string | null => {
      return lastPage?.page.cursor || null;
    },
    queryFn: (context) => {
      const cursor = context.pageParam;
      return transactionHistoryService.fetchAllTransactionHistory(currentAddress || '', cursor);
    },
    enabled:
      !!currentAddress
      && tokenMetainfos.length > 0
      && transactionHistoryService.supported
      && enabled,
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL,
  });

  const transactions = useMemo(() => {
    if (!allTransactions) {
      return null;
    }

    return allTransactions.pages.flatMap(
      (page: unknown) => (page as TransactionWithPageInfo).transactions,
    );
  }, [allTransactions?.pages]);

  const firstTransactionHash = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return '';
    }

    return transactions[0]?.hash;
  }, [transactions]);

  const {
    data, isFetched, status, isLoading, isFetching,
  } = useMakeTransactionsWithTime(
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
        .then(result => !result.error)
        .catch(() => false);
    },
    refetch: refetchTransactions,
  };
};
