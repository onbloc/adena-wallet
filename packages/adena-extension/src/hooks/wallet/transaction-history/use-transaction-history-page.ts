import { RefetchOptions, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { isSessionAccount } from 'adena-module';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { TransactionInfo } from '@types';
import {
  EMPTY_TRANSACTION_HISTORY,
  HistoryPageParam,
  SessionMergedTransactionHistory,
  buildNextHistoryPageParam,
  dedupeAndSortTransactions,
  mergeSessionTransactionHistories,
} from './session-history-source';
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

  const historySource = useMemo(() => {
    if (currentAccount && isSessionAccount(currentAccount)) {
      return {
        primaryAddress: currentAccount.getMasterAddress(),
        sessionAddress: currentAddress,
      };
    }
    return {
      primaryAddress: currentAddress,
      sessionAddress: null,
    };
  }, [currentAccount, currentAddress]);

  const {
    data: allTransactions,
    hasNextPage,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery<SessionMergedTransactionHistory, Error, unknown, any>(
    {
      queryKey: [
        'history/page/all',
        currentNetwork.networkId,
        historySource.primaryAddress || '',
        historySource.sessionAddress || '',
      ],
      getNextPageParam: (
        lastPage?: SessionMergedTransactionHistory,
      ): HistoryPageParam | null => {
        return lastPage?.nextPageParam ?? null;
      },
      queryFn: async (context: any) => {
        const pageParam = context?.pageParam as HistoryPageParam | undefined;
        if (!historySource.primaryAddress) {
          return {
            ...mergeSessionTransactionHistories(EMPTY_TRANSACTION_HISTORY, null),
            nextPageParam: null,
          };
        }

        const primaryHistory =
          pageParam?.primaryDone === true
            ? EMPTY_TRANSACTION_HISTORY
            : await transactionHistoryService.fetchAllTransactionHistory(
                historySource.primaryAddress,
                pageParam?.primaryCursor ?? null,
              );
        const shouldFetchSessionHistory =
          !!historySource.sessionAddress &&
          historySource.sessionAddress !== historySource.primaryAddress &&
          pageParam?.sessionDone !== true;
        const sessionHistory = shouldFetchSessionHistory
          ? await transactionHistoryService
              .fetchAllTransactionHistory(
                historySource.sessionAddress || '',
                pageParam?.sessionCursor ?? null,
              )
              .catch(() => null)
          : null;

        return {
          ...mergeSessionTransactionHistories(primaryHistory, sessionHistory),
          nextPageParam: buildNextHistoryPageParam(primaryHistory, sessionHistory, pageParam),
        };
      },
    },
    {
      enabled:
        !!historySource.primaryAddress &&
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
      (page: unknown) => (page as SessionMergedTransactionHistory).transactions,
    );
    return dedupeAndSortTransactions(pageTransactions);
  }, [allTransactions?.pages]);
  const fallbackSessionHashes = useMemo(() => {
    const hashes =
      allTransactions?.pages.flatMap(
        (page: unknown) => (page as SessionMergedTransactionHistory).sessionSourceHashes,
      ) ?? [];
    return new Set(hashes);
  }, [allTransactions?.pages]);

  const {
    transactions: sessionFilteredTransactions,
    isLoading: isSessionFilterLoading,
    isFetching: isSessionFilterFetching,
  } = useSessionFilteredTransactions(transactions, { fallbackSessionHashes });

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
