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

  const { data: allTransactions, refetch } = useQuery(
    ['history/common/all', currentNetwork.networkId, currentAddress],
    () => transactionHistoryService.fetchAllTransactionHistory(currentAddress || ''),
    {
      enabled:
        !!currentAddress &&
        tokenMetainfos.length > 0 &&
        transactionHistoryService.supported &&
        enabled,
    },
  );

  const blockIndex = useMemo(() => {
    if (!allTransactions) {
      return null;
    }
    if (!fetchedHistoryBlockHeight) {
      return allTransactions.length < 20 ? allTransactions.length : 20;
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

    return allTransactions.slice(0, blockIndex || 0);
  }, [allTransactions, blockIndex]);

  const { data, isFetched, status, isLoading, isFetching } = useMakeTransactionsWithTime(
    `history/common/all/${currentNetwork.chainId}/${transactions?.length}`,
    transactions,
  );

  const fetchNextPage = async (): Promise<boolean> => {
    const transactionSize = allTransactions?.length || 0;
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
    hasNextPage: allTransactions?.length !== blockIndex,
    fetchNextPage,
    refetch: refetchTransactions,
  };
};
