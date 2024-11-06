import { TransactionHistoryMapper } from '@repositories/transaction/mapper/transaction-history-mapper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TransactionInfo } from '@types';
import { useGetAllGRC721Collections } from './nft/use-get-all-grc721-collections';
import { useAdenaContext } from './use-context';
import { useGRC20Tokens } from './use-grc20-tokens';
import { useNetwork } from './use-network';
import { useTokenMetainfo } from './use-token-metainfo';

export interface UseMakeTransactionsWithTimeReturn {
  status: 'loading' | 'error' | 'success';
  isLoading: boolean;
  isFetched: boolean;
  isFetching: boolean;
  data: { title: string; transactions: TransactionInfo[] }[] | null | undefined;
}

export const useMakeTransactionsWithTime = (
  key: string,
  transactions: TransactionInfo[] | null | undefined,
): UseMakeTransactionsWithTimeReturn => {
  const { currentNetwork } = useNetwork();
  const { transactionHistoryService } = useAdenaContext();
  const { allTokenMetainfos, getTokenImageByDenom, getTokenAmount } = useTokenMetainfo();
  const { isFetched: isFetchedTokens } = useGRC20Tokens();
  const { data: grc721Collections = [], isFetched: isFetchedGRC721Collections } =
    useGetAllGRC721Collections();

  const queryClient = useQueryClient();

  const { status, isLoading, isFetched, isFetching, data } = useQuery({
    queryKey: ['useMakeTransactionsWithTime', currentNetwork.chainId, key || ''],
    queryFn: () => {
      if (!transactions || !grc721Collections) {
        return null;
      }

      return Promise.all(
        transactions.map(async (transaction) => {
          const time = await queryClient.fetchQuery(
            ['blockTime', currentNetwork.networkId, transaction.height || 1],
            () => transactionHistoryService.fetchBlockTime(Number(transaction.height || 1)),
            { staleTime: Infinity },
          );

          if (transaction.type === 'TRANSFER_GRC721') {
            const amount = transaction.amount;
            const collection = grc721Collections.find(
              (collection) => collection.packagePath === amount.denom,
            );
            return {
              ...transaction,
              amount: {
                ...amount,
                denom: collection?.symbol || amount.denom,
              },
              networkFee: getTokenAmount(
                transaction.networkFee || {
                  value: '0',
                  denom: 'GNOT',
                },
              ),
              logo: collection?.packagePath || '',
              date: time || '',
            };
          }
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
    select: (data) => {
      if (!data) {
        return null;
      }
      return TransactionHistoryMapper.queryToDisplay(data);
    },
    enabled:
      !!transactionHistoryService.supported &&
      !!transactions &&
      isFetchedTokens &&
      isFetchedGRC721Collections &&
      allTokenMetainfos.length > 0,
    keepPreviousData: true,
  });

  return { status, isLoading, isFetched, isFetching, data };
};
