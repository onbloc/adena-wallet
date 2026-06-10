import { RefetchOptions, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { isSessionAccount } from 'adena-module';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { TransactionInfo, TransactionWithPageInfo } from '@types';
import { useSessionFilteredTransactions } from './use-session-filtered-transactions';

const REFETCH_INTERVAL = 3_000;

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
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();
  const { tokenMetainfos } = useTokenMetainfo();

  const historyAddress = useMemo(() => {
    if (currentAccount && isSessionAccount(currentAccount)) {
      return currentAccount.getMasterAddress();
    }
    return currentAddress;
  }, [currentAccount, currentAddress]);

  const {
    data: allTransactions,
    hasNextPage,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery<TransactionWithPageInfo, Error, unknown, any>(
    {
      queryKey: ['history/page/all', currentNetwork.networkId, historyAddress || ''],
      getNextPageParam: (lastPage?: TransactionWithPageInfo): string | boolean | null => {
        return lastPage?.page.cursor || null;
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
        return transactionHistoryService.fetchAllTransactionHistory(historyAddress || '', cursor);
      },
    },
    {
      enabled:
        !!historyAddress &&
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

    return allTransactions.pages.flatMap(
      (page: unknown) => (page as TransactionWithPageInfo).transactions,
    );
  }, [allTransactions?.pages]);

  const {
    transactions: sessionFilteredTransactions,
    isLoading: isSessionFilterLoading,
    isFetching: isSessionFilterFetching,
  } = useSessionFilteredTransactions(transactions);

  const firstTransactionHash = useMemo(() => {
    if (!sessionFilteredTransactions || sessionFilteredTransactions.length === 0) {
      return '';
    }

    return sessionFilteredTransactions[0]?.hash;
  }, [sessionFilteredTransactions]);

  const { data, isFetched, status, isLoading, isFetching } = useMakeTransactionsWithTime(
    `history/page/all/${currentNetwork.chainId}/${firstTransactionHash}`,
    sessionFilteredTransactions,
  );

  const refetchTransactions = (options?: RefetchOptions): void => {
    refetch(options);
  };

  return {
    data: data || null,
    isSupported: transactionHistoryService.supported && enabled,
    isFetched: isFetched,
    status: isSessionFilterLoading ? 'loading' : status,
    isLoading: isSessionFilterLoading || isLoading,
    isFetching: isSessionFilterFetching || isFetching,
    hasNextPage: hasNextPage !== false,
    fetchNextPage: (): Promise<boolean> => {
      return fetchNextPage()
        .then((result) => !result.error)
        .catch(() => false);
    },
    refetch: refetchTransactions,
  };
};
