import { useMemo } from 'react';
import { RefetchOptions, useInfiniteQuery } from '@tanstack/react-query';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { TransactionInfo, TransactionWithPageInfo } from '@types';

export const useTransactionHistoryPage = ({
  enabled,
}: {
  enabled: boolean;
}): {
  data: TransactionInfo[] | null;
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
      getNextPageParam: (lastPage?: TransactionWithPageInfo): string | boolean | null => {
        return lastPage?.cursor || null;
      },
      queryFn: (context: any) => {
        if (context?.pageParam === false) {
          return {
            hasNext: false,
            cursor: null,
            transactions: [],
          };
        }

        const cursor = context?.pageParam || null;
        return transactionHistoryService.fetchAllTransactionHistoryPage(
          currentAddress || '',
          cursor,
        );
      },
    },
    {
      enabled:
        !!currentAddress &&
        tokenMetainfos.length > 0 &&
        transactionHistoryService.supported &&
        enabled,
    },
  );

  const transactions = useMemo(() => {
    if (!allTransactions) {
      return null;
    }

    return allTransactions.pages.flatMap(
      (page: unknown) => (page as TransactionWithPageInfo).transactions,
    );
  }, [allTransactions]);

  const { data, isFetched, status, isLoading, isFetching } = useMakeTransactionsWithTime(
    `history/page/all/${currentNetwork.chainId}/${transactions?.length}`,
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
