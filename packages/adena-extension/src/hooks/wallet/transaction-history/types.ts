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
  /**
   * True while a next page or the processing query is loading. Background
   * refetches from polling are not counted, so they cannot block the next page.
   */
  isFetching: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<boolean>;
  refetch: (options?: RefetchOptions) => void;
}
