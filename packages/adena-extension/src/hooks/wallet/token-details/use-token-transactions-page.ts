import { useMemo } from 'react';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { RefetchOptions, useInfiniteQuery } from '@tanstack/react-query';
import { TransactionInfo } from '@types';

export const useTokenTransactionsPage = (
  isNative: boolean | undefined,
  tokenPath: string,
  { enabled }: { enabled: boolean },
): {
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
    refetch,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    [
      'token-details/page/history',
      currentNetwork.networkId,
      `${isNative}`,
      currentAddress,
      tokenPath,
    ],
    (context: any) => {
      if (isNative === undefined) {
        return null;
      }

      const cursor = context.pageParam || null;

      return isNative
        ? transactionHistoryService.fetchNativeTransactionHistory(currentAddress || '', cursor)
        : transactionHistoryService.fetchGRC20TransactionHistory(
            currentAddress || '',
            tokenPath,
            cursor,
          );
    },
    {
      enabled:
        !!currentAddress &&
        transactionHistoryService.supported &&
        tokenMetainfos.length > 0 &&
        enabled,
    },
  );

  const transactions = useMemo(() => {
    if (!allTransactions) {
      return null;
    }

    return allTransactions.pages.flatMap((page) => page?.transactions || []);
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
