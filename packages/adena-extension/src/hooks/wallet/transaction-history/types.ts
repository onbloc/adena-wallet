import type { RefetchOptions } from '@tanstack/react-query';
import type { TransactionInfo } from '@types';

export type TransactionHistoryStatus = 'unsupported' | 'loading' | 'error' | 'success';

export interface TransactionHistoryResult {
  data:
    | {
      title: string;
      transactions: TransactionInfo[];
    }[]
    | null;
  status: TransactionHistoryStatus;
  // Next-page fetching or post-processing is in progress; excludes background refetches.
  isFetching: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<boolean>;
  refetch: (options?: RefetchOptions) => void;
}
