import { useMemo } from 'react';
import { isSessionAccount } from 'adena-module';
import { useRecoilState } from 'recoil';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useMakeTransactionsWithTime } from '@hooks/use-make-transactions-with-time';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { CommonState } from '@states';
import { RefetchOptions, useQuery } from '@tanstack/react-query';
import { TransactionInfo } from '@types';
import { useSessionFilteredTransactions } from './use-session-filtered-transactions';

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
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();
  const { tokenMetainfos } = useTokenMetainfo();
  const [fetchedHistoryBlockHeight, setFetchedHistoryBlockHeight] = useRecoilState(
    CommonState.fetchedHistoryBlockHeight,
  );

  const historyAddress = useMemo(() => {
    if (currentAccount && isSessionAccount(currentAccount)) {
      return currentAccount.getMasterAddress();
    }
    return currentAddress;
  }, [currentAccount, currentAddress]);

  const { data: allTransactions, refetch } = useQuery(
    ['history/common/all', currentNetwork.networkId, historyAddress],
    () => transactionHistoryService.fetchAllTransactionHistory(historyAddress || ''),
    {
      enabled:
        !!historyAddress &&
        tokenMetainfos.length > 0 &&
        transactionHistoryService.supported &&
        enabled,
    },
  );

  const fetchedTransactions = useMemo(() => {
    return allTransactions?.transactions ?? null;
  }, [allTransactions]);

  const {
    transactions: sessionFilteredTransactions,
    isLoading: isSessionFilterLoading,
    isFetching: isSessionFilterFetching,
  } = useSessionFilteredTransactions(fetchedTransactions);

  const blockIndex = useMemo(() => {
    if (!sessionFilteredTransactions) {
      return null;
    }
    if (!fetchedHistoryBlockHeight) {
      return sessionFilteredTransactions.length < 20 ? sessionFilteredTransactions.length : 20;
    }
    return fetchedHistoryBlockHeight;
  }, [sessionFilteredTransactions, fetchedHistoryBlockHeight]);

  const transactions = useMemo(() => {
    if (!sessionFilteredTransactions || blockIndex === null) {
      return null;
    }

    return sessionFilteredTransactions.slice(0, blockIndex || 0);
  }, [sessionFilteredTransactions, blockIndex]);

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
    const transactionSize = sessionFilteredTransactions?.length || 0;
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
    status: isSessionFilterLoading ? 'loading' : status,
    isLoading: isSessionFilterLoading || isLoading,
    isFetching: isSessionFilterFetching || isFetching,
    hasNextPage: sessionFilteredTransactions
      ? sessionFilteredTransactions.length !== blockIndex
      : false,
    fetchNextPage,
    refetch: refetchTransactions,
  };
};
