import type { QueryStatus } from '@tanstack/react-query';

import type { TransactionHistoryResult, TransactionHistoryStatus } from './types';

export const canFetchNextHistoryPage = (
  loadingNextFetch: boolean,
  status: TransactionHistoryStatus,
  isFetching: boolean,
  hasNextPage: boolean,
): boolean => loadingNextFetch && status === 'success' && !isFetching && hasNextPage;

export const deriveHistoryStatus = (
  supported: boolean,
  enabled: boolean,
  fetchStatus: QueryStatus,
  processingStatus: 'loading' | 'error' | 'success',
  hasFetchData: boolean,
): TransactionHistoryStatus => {
  if (!supported || !enabled) {
    return 'unsupported';
  }
  if (fetchStatus === 'error' && !hasFetchData) {
    return 'error';
  }
  if (fetchStatus === 'pending' || processingStatus === 'loading') {
    return 'loading';
  }
  return processingStatus;
};

export const deriveHistoryData = (
  data: TransactionHistoryResult['data'] | undefined,
  status: TransactionHistoryStatus,
  hasFetchData: boolean,
): TransactionHistoryResult['data'] => {
  return status === 'error' && !hasFetchData ? null : data || null;
};
