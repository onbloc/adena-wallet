import { useQuery } from '@tanstack/react-query';
import { TransactionInfo } from '@types';
import { useAdenaContext } from './use-context';
import { useNetwork } from './use-network';
import { useTokenMetainfo } from './use-token-metainfo';

export interface UseMakeTransactionsWithTimeReturn {
  status: 'loading' | 'error' | 'success';
  isLoading: boolean;
  isFetched: boolean;
  isFetching: boolean;
  data: TransactionInfo[] | null | undefined;
}

export const useMakeTransactionsWithTime = (
  key: string,
  transactions: TransactionInfo[] | null | undefined,
): UseMakeTransactionsWithTimeReturn => {
  const { currentNetwork } = useNetwork();
  const { transactionHistoryService } = useAdenaContext();
  const { getTokenImageByDenom, getTokenAmount } = useTokenMetainfo();

  const { status, isLoading, isFetched, isFetching, data } = useQuery({
    queryKey: ['useMakeTransactionsWithTime', currentNetwork.chainId, key || ''],
    queryFn: () => {
      if (!transactions) {
        return null;
      }

      return Promise.all(
        transactions.map(async (transaction) => {
          const time = await transactionHistoryService.fetchBlockTime(
            Number(transaction.height || 1),
          );
          return {
            ...transaction,
            amount: getTokenAmount(transaction.amount),
            networkFee: getTokenAmount(
              transaction.networkFee || {
                value: '0',
                denom: 'GNOT',
              },
            ),
            logo: getTokenImageByDenom(transaction.logo) || '',
            date: time || '',
          };
        }),
      );
    },
    enabled: !!transactionHistoryService.supported && !!transactions,
    keepPreviousData: true,
  });

  return { status, isLoading, isFetched, isFetching, data };
};
