import React, { useCallback, useEffect, useState } from 'react';
import TransactionHistory from '@components/transaction-history/transaction-history/transaction-history';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { TransactionHistoryMapper } from '@repositories/transaction/mapper/transaction-history-mapper';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { HISTORY_FETCH_INTERVAL_TIME } from '@common/constants/interval.constant';

const TokenDetailsContainer: React.FC = () => {
  const navigate = useNavigate();
  const { currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();
  const { convertDenom, getTokenImageByDenom } = useTokenMetainfo();
  const [bodyElement, setBodyElement] = useState<HTMLBodyElement | undefined>();
  const [loadingNextFetch, setLoadingNextFetch] = useState(false);

  const { status, isLoading, isFetching, data, refetch, fetchNextPage } = useInfiniteQuery(
    ['history/all', currentAddress],
    ({ pageParam = 0 }) => fetchHistories(pageParam),
    {
      getNextPageParam: (lastPage, allPosts) => {
        const from = allPosts.reduce((sum, { txs }) => sum + txs.length, 0);
        return lastPage.next ? from : undefined;
      },
    },
  );

  useEffect(() => {
    if (currentAddress) {
      const historyFetchTimer = setInterval(() => {
        refetch({ refetchPage: (_, index) => index === 0 });
      }, HISTORY_FETCH_INTERVAL_TIME);
      return () => clearInterval(historyFetchTimer);
    }
  }, [currentAddress, refetch]);

  useEffect(() => {
    if (loadingNextFetch && !isLoading && !isFetching) {
      fetchNextPage().then(() => setLoadingNextFetch(false));
    }
  }, [loadingNextFetch, isLoading, isFetching]);

  useEffect(() => {
    if (document.getElementsByTagName('body').length > 0) {
      setBodyElement(document.getElementsByTagName('body')[0]);
    }
  }, [document.getElementsByTagName('body')]);

  useEffect(() => {
    bodyElement?.addEventListener('scroll', onScrollListener);
    return () => bodyElement?.removeEventListener('scroll', onScrollListener);
  }, [bodyElement]);

  const onScrollListener = (): void => {
    if (bodyElement) {
      const remain = bodyElement.offsetHeight - bodyElement.scrollTop;
      if (remain < 20) {
        setLoadingNextFetch(true);
      }
    }
  };

  const fetchHistories = async (
    pageParam: number,
  ): Promise<{
    hits: number;
    next: boolean;
    txs: {
      logo: string;
      amount: { value: string; denom: string };
      hash: string;
      type: 'TRANSFER' | 'ADD_PACKAGE' | 'CONTRACT_CALL' | 'MULTI_CONTRACT_CALL';
      typeName?: string | undefined;
      status: 'SUCCESS' | 'FAIL';
      title: string;
      description?: string | undefined;
      extraInfo?: string | undefined;
      valueType: 'DEFAULT' | 'ACTIVE' | 'BLUR';
      date: string;
      from?: string | undefined;
      to?: string | undefined;
      originFrom?: string | undefined;
      originTo?: string | undefined;
      networkFee?: { value: string; denom: string } | undefined;
    }[];
  }> => {
    if (!currentAddress) {
      return {
        hits: 0,
        next: false,
        txs: [],
      };
    }
    const size = 20;
    const histories = await transactionHistoryService.fetchAllTransactionHistory(
      currentAddress,
      pageParam,
      size,
    );
    const txs = histories.txs.map((transaction) => {
      return {
        ...transaction,
        logo: getTokenImageByDenom(transaction.amount.denom) || `${UnknownTokenIcon}`,
        amount: convertDenom(transaction.amount.value, transaction.amount.denom, 'COMMON'),
      };
    });
    return {
      hits: histories.hits,
      next: histories.next,
      txs: txs,
    };
  };

  const onClickItem = useCallback(
    (hash: string) => {
      const transactions =
        TransactionHistoryMapper.queryToDisplay(data?.pages ?? []).flatMap(
          (group) => group.transactions,
        ) ?? [];
      const transactionInfo = transactions.find((transaction) => transaction.hash === hash);
      if (transactionInfo) {
        navigate(RoutePath.TransactionDetail, {
          state: transactionInfo,
        });
      }
    },
    [data],
  );

  return (
    <TransactionHistory
      status={status}
      transactionInfoLists={TransactionHistoryMapper.queryToDisplay(data?.pages ?? [])}
      onClickItem={onClickItem}
    />
  );
};

export default TokenDetailsContainer;
