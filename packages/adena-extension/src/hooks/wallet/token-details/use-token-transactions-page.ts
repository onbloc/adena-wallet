import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { RefetchOptions, useInfiniteQuery } from '@tanstack/react-query';
import { TransactionWithPageInfo } from '@types';
import { useMemo } from 'react';

import type { TransactionHistoryResult } from '../transaction-history/types';

export const useTokenTransactionsPage = (
  isNative: boolean | undefined,
  tokenPath: string,
  { enabled }: { enabled: boolean },
): TransactionHistoryResult => {
  const { currentNetwork } = useNetwork();
  const { currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();
  const { tokenMetainfos } = useTokenMetainfo();

  const {
    data: allTransactions,
    refetch,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [
      'token-details/page/history',
      currentNetwork.networkId,
      `${isNative}`,
      currentAddress,
      tokenPath,
    ],
    queryFn: ({ pageParam }): Promise<TransactionWithPageInfo | null> | null => {
      if (isNative === undefined) {
        return null;
      }

      return isNative
        ? transactionHistoryService.fetchNativeTransactionHistory(currentAddress || '', pageParam)
        : transactionHistoryService.fetchGRC20TransactionHistory(
            currentAddress || '',
            tokenPath,
            pageParam,
          );
    },
    initialPageParam: null as string | null,
    // v4 ran this without getNextPageParam, so "next page" re-read the first
    // page; follow the cursor the way the account history does.
    getNextPageParam: (lastPage): string | null =>
      lastPage?.page.hasNext ? lastPage.page.cursor : null,
    enabled:
      !!currentAddress
      && transactionHistoryService.supported
      && tokenMetainfos.length > 0
      && enabled,
  });

  const transactions = useMemo(() => {
    if (!allTransactions) {
      return null;
    }

    return allTransactions.pages.flatMap(page => page?.transactions || []);
  }, [allTransactions]);

  const firstTransactionHash = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return '';
    }

    return transactions[0]?.hash;
  }, [transactions]);

  const { data, isFetched, status, isLoading, isFetching } = useMakeTransactionsWithTime(
    `token-details/page/history/${currentNetwork.chainId}/${firstTransactionHash}/${tokenPath}`,
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
    fetchNextPage: () =>
      fetchNextPage()
        .then(() => true)
        .catch(() => false),
    hasNextPage: hasNextPage !== false,
    refetch: refetchTransactions,
  };
};
