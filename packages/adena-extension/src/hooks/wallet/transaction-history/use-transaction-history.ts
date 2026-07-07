import { useMemo } from 'react';
import { useRecoilState } from 'recoil';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { CommonState } from '@states';
import { RefetchOptions, useQuery } from '@tanstack/react-query';
import { TransactionInfo } from '@types';
import { dedupeAndSortTransactions } from './session-history-source';

// Indexer-backed (block-index paged) transaction history, used only when the
// network has no API URL. Session accounts always run on API-backed networks,
// so this path queries `currentAddress` uniformly with no session-specific
// handling.
export const useTransactionHistory = ({
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
  const [fetchedHistoryBlockHeight, setFetchedHistoryBlockHeight] = useRecoilState(
    CommonState.fetchedHistoryBlockHeight,
  );

  const { data: fetchedTransactions, refetch } = useQuery(
    ['history/common/all', currentNetwork.networkId, currentAddress],
    async () => {
      if (!currentAddress) {
        return [];
      }

      const history = await transactionHistoryService.fetchAllTransactionHistory(currentAddress);
      return dedupeAndSortTransactions(history.transactions);
    },
    {
      enabled:
        !!currentAddress &&
        tokenMetainfos.length > 0 &&
        transactionHistoryService.supported &&
        enabled,
    },
  );

  const blockIndex = useMemo(() => {
    if (!fetchedTransactions) {
      return null;
    }
    if (!fetchedHistoryBlockHeight) {
      return fetchedTransactions.length < 20 ? fetchedTransactions.length : 20;
    }
    return fetchedHistoryBlockHeight;
  }, [fetchedTransactions, fetchedHistoryBlockHeight]);

  const transactions = useMemo(() => {
    if (!fetchedTransactions || blockIndex === null) {
      return null;
    }

    return fetchedTransactions.slice(0, blockIndex || 0);
  }, [fetchedTransactions, blockIndex]);

  const firstTransactionHash = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return '';
    }

    return transactions[0]?.hash;
  }, [transactions]);

  const { data, isFetched, status, isLoading, isFetching } = useMakeTransactionsWithTime(
    `history/common/all/${currentNetwork.chainId}/${firstTransactionHash}`,
    transactions,
  );

  const fetchNextPage = async (): Promise<boolean> => {
    const transactionSize = fetchedTransactions?.length || 0;
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
    hasNextPage: transactions ? transactions.length !== blockIndex : false,
    fetchNextPage,
    refetch: refetchTransactions,
  };
};
