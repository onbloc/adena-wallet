import React, { useCallback } from 'react';
import TransactionHistory, { TransactionInfo } from '@components/transaction-history/transaction-history/transaction-history';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { getDateText } from '@common/utils/client-utils';

const HistoryContainer: React.FC = () => {
  const navigate = useNavigate();
  const { currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();
  const { convertDenom, getTokenImage } = useTokenMetainfo();

  const {
    status,
    data,
    error,
    isFetching,
    isFetchingNextPage,
    isFetchingPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
  } = useInfiniteQuery(
    ['history/all', currentAddress],
    async ({ pageParam = 0 }) => {
      if (!currentAddress) {
        return [];
      }
      const histories = await transactionHistoryService.fetchAllTransactionHistory(currentAddress, 0, pageParam);
      return histories.map(transaction => {
        return {
          ...transaction,
          logo: getTokenImage(transaction.amount.denom) ?? '',
          amount: convertDenom(transaction.amount.value, transaction.amount.denom, 'COMMON')
        }
      });
    }
  );

  const mappedTransactions = useCallback(() => {
    const transactions = data?.pages.flat() ?? [];
    const initValue: { title: string, transactions: TransactionInfo[] }[] = [];

    return transactions.reduce((accum: { title: string, transactions: TransactionInfo[] }[], current) => {
      const title = getDateText(current.date.slice(0, 10));
      const accumIndex = accum.findIndex(item => item.title === title);
      if (accumIndex < 0) {
        accum.push({
          title,
          transactions: [current]
        });
      } else {
        accum[accumIndex].transactions.push(current);
      }
      return accum;
    }, initValue);
  }, [data]);

  const onClickItem = useCallback((hash: string) => {
    const transactions = mappedTransactions().flatMap(group => group.transactions) ?? [];
    const transactionInfo = transactions.find(transaction => transaction.hash === hash);
    if (transactionInfo) {
      navigate(RoutePath.TransactionDetail, {
        state: transactionInfo
      })
    }
  }, [data]);

  return (
    <TransactionHistory
      status={status}
      transactionInfoLists={mappedTransactions()}
      onClickItem={onClickItem}
    />
  );
};

export default HistoryContainer;