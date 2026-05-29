import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Account, isSessionAccount } from 'adena-module';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { TransactionInfo } from '@types';
import {
  annotateTransactionsWithSessionAddress,
  filterTransactionsBySessionAddress,
} from './session-transaction-filter';

export interface SessionFilteredTransactionsResult {
  transactions: TransactionInfo[] | null;
  isLoading: boolean;
  isFetching: boolean;
}

interface UseSessionFilteredTransactionsOptions {
  fallbackSessionHashes?: ReadonlySet<string>;
}

function getSessionMasterAddress(account: Account | null): string | null {
  if (!account || !isSessionAccount(account)) {
    return null;
  }
  return account.getMasterAddress();
}

export const useSessionFilteredTransactions = (
  transactions: TransactionInfo[] | null,
  options: UseSessionFilteredTransactionsOptions = {},
): SessionFilteredTransactionsResult => {
  const { currentNetwork } = useNetwork();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();

  const isSession = currentAccount !== null && isSessionAccount(currentAccount);
  const masterAddress = useMemo(() => {
    if (isSession) {
      return getSessionMasterAddress(currentAccount);
    }
    return currentAddress;
  }, [currentAccount, currentAddress, isSession]);
  const hashKey = useMemo(
    () => transactions?.map((transaction) => transaction.hash).join('|') ?? '',
    [transactions],
  );
  const fallbackHashKey = useMemo(
    () => Array.from(options.fallbackSessionHashes ?? []).sort().join('|'),
    [options.fallbackSessionHashes],
  );

  const { data, isLoading, isFetching } = useQuery(
    [
      'history/session-filter',
      currentNetwork.networkId,
      currentAccount?.id || '',
      currentAddress || '',
      hashKey,
      fallbackHashKey,
    ],
    () => {
      if (!transactions || !masterAddress) {
        return [];
      }

      if (!isSession) {
        return annotateTransactionsWithSessionAddress({
          transactions,
          masterAddress,
          fetchSessionAddressByHash: (hash) =>
            transactionHistoryService.fetchTransactionSessionAddress(hash),
        });
      }

      if (!currentAddress) {
        return [];
      }

      return filterTransactionsBySessionAddress({
        transactions,
        masterAddress,
        sessionAddress: currentAddress,
        fallbackSessionHashes: options.fallbackSessionHashes,
        fetchSessionAddressByHash: (hash) =>
          transactionHistoryService.fetchTransactionSessionAddress(hash),
      });
    },
    {
      enabled:
        currentAccount !== null &&
        !!transactions &&
        !!masterAddress &&
        (!isSession || !!currentAddress),
      keepPreviousData: true,
    },
  );

  if (!currentAccount) {
    return {
      transactions,
      isLoading: false,
      isFetching: false,
    };
  }

  return {
    transactions: data || null,
    isLoading,
    isFetching,
  };
};
