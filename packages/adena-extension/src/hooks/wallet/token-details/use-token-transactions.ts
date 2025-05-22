import { useMemo, useState } from 'react';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { RefetchOptions, useQuery } from '@tanstack/react-query';
import { TransactionInfo } from '@types';

export const useTokenTransactions = (
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
  const [fetchedHistoryBlockHeight, setFetchedHistoryBlockHeight] = useState<number | null>(null);

  const { data: allTransactions, refetch } = useQuery(
    ['token-details/history', currentNetwork.networkId, `${isNative}`, currentAddress, tokenPath],
    () => {
      if (isNative === undefined) {
        return null;
      }

      return isNative
        ? transactionHistoryService.fetchNativeTransactionHistory(currentAddress || '')
        : transactionHistoryService.fetchGRC20TransactionHistory(currentAddress || '', tokenPath);
    },
    {
      enabled:
        !!currentAddress &&
        transactionHistoryService.supported &&
        tokenMetainfos.length > 0 &&
        enabled,
    },
  );

  const blockIndex = useMemo(() => {
    if (!allTransactions) {
      return null;
    }

    if (!fetchedHistoryBlockHeight) {
      return allTransactions.transactions.length < 20 ? allTransactions.transactions.length : 20;
    }

    return fetchedHistoryBlockHeight;
  }, [allTransactions, fetchedHistoryBlockHeight]);

  const transactions = useMemo(() => {
    if (!allTransactions) {
      return null;
    }

    if (blockIndex === null) {
      return null;
    }

    return allTransactions.transactions.slice(0, blockIndex || 0);
  }, [allTransactions, blockIndex]);

  const { data, isFetched, status, isLoading, isFetching } = useMakeTransactionsWithTime(
    `token-details/history/${currentNetwork.chainId}/${transactions?.length}/${tokenPath}`,
    transactions,
  );

  const fetchNextPage = async (): Promise<boolean> => {
    const transactionSize = allTransactions?.transactions.length || 0;
    const endIndex = blockIndex || 20;
    const nextBlockIndex = endIndex >= transactionSize ? transactionSize : endIndex + 20;

    await setFetchedHistoryBlockHeight(nextBlockIndex);
    return true;
  };

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
    hasNextPage: allTransactions?.transactions.length !== blockIndex,
    fetchNextPage,
    refetch: refetchTransactions,
  };
};
