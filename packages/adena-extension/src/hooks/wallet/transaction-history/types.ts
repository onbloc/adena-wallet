import type { RefetchOptions } from '@tanstack/react-query';
import type { TransactionInfo } from '@types';

export interface TransactionHistoryResult {
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
}
