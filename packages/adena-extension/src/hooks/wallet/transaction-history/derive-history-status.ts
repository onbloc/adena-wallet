import type { QueryStatus } from '@tanstack/react-query';

import type { TransactionHistoryStatus } from './types';

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
