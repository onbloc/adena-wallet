import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { CommonState } from '@states';
import { RefetchOptions, useQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

import { deriveHistoryStatus } from './derive-history-status';
import { dedupeAndSortTransactions } from './session-history-source';
import type { TransactionHistoryResult } from './types';

// Indexer-backed (block-index paged) transaction history, used only when the
// network has no API URL. Session accounts always run on API-backed networks,
// so this path queries `currentAddress` uniformly with no session-specific
// handling.
export const useTransactionHistory = ({
  enabled,
}: {
  enabled: boolean;
}): TransactionHistoryResult => {
  const { currentNetwork } = useNetwork();
  const { currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();
  const { tokenMetainfos } = useTokenMetainfo();
  const [fetchedHistoryBlockHeight, setFetchedHistoryBlockHeight] = useAtom(
    CommonState.fetchedHistoryBlockHeight,
  );

  const {
    data: fetchedTransactions,
    refetch,
    status: fetchStatus,
  } = useQuery({
    queryKey: ['history/common/all', currentNetwork.networkId, currentAddress],

    queryFn: async () => {
      if (!currentAddress) {
        return [];
      }

      const history = await transactionHistoryService.fetchAllTransactionHistory(currentAddress);
      return dedupeAndSortTransactions(history.transactions);
    },

    enabled:
      !!currentAddress
      && tokenMetainfos.length > 0
      && transactionHistoryService.supported
      && enabled,
  });

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

  const { data, status: processingStatus, isFetching: isProcessing } = useMakeTransactionsWithTime(
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

  const refetchTransactions = useCallback(
    (options?: RefetchOptions): void => {
      refetch(options);
    },
    [refetch],
  );

  return {
    data: data || null,
    status: deriveHistoryStatus(
      transactionHistoryService.supported,
      enabled,
      fetchStatus,
      processingStatus,
      !!fetchedTransactions,
    ),
    isFetching: isProcessing,
    hasNextPage: transactions ? transactions.length !== blockIndex : false,
    fetchNextPage,
    refetch: refetchTransactions,
  };
};
