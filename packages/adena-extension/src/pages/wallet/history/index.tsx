import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';

import { TransactionHistory } from '@components/molecules';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { RoutePath } from '@router/path';
import { TransactionHistoryMapper } from '@repositories/transaction/mapper/transaction-history-mapper';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import useScrollHistory from '@hooks/use-scroll-history';
import { HISTORY_FETCH_INTERVAL_TIME } from '@common/constants/interval.constant';
import { fonts } from '@styles/theme';

const HistoryLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;
  margin-bottom: 60px;

  .title-wrapper {
    margin-bottom: 12px;

    .title {
      ${fonts.header4};
    }
  }
`;
const HistoryContainer: React.FC = () => {
  const navigate = useNavigate();
  const { currentAddress } = useCurrentAccount();
  const { transactionHistoryService } = useAdenaContext();
  const { convertDenom, getTokenImageByDenom } = useTokenMetainfo();
  const [bodyElement, setBodyElement] = useState<HTMLBodyElement | undefined>();
  const [loadingNextFetch, setLoadingNextFetch] = useState(false);
  const { saveScrollPosition } = useScrollHistory();

  const { status, isLoading, isFetching, data, refetch, fetchNextPage } = useInfiniteQuery(
    ['history/all', currentAddress],
    ({ pageParam = 0 }) => fetchTokenHistories(pageParam),
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

  const fetchTokenHistories = async (
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
      const { value, denom } = convertDenom(
        transaction.amount.value,
        transaction.amount.denom,
        'COMMON',
      );
      return {
        ...transaction,
        logo: getTokenImageByDenom(transaction.amount.denom) || `${UnknownTokenIcon}`,
        amount: {
          value: BigNumber(value).toFormat(),
          denom,
        },
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
        saveScrollPosition(bodyElement?.scrollTop);
        navigate(RoutePath.TransactionDetail, {
          state: transactionInfo,
        });
      }
    },
    [data, bodyElement],
  );

  return (
    <HistoryLayout>
      <div className='title-wrapper'>
        <span className='title'>History</span>
      </div>
      <div className='transaction-history-wrapper'>
        <TransactionHistory
          status={status}
          transactionInfoLists={TransactionHistoryMapper.queryToDisplay(data?.pages ?? [])}
          onClickItem={onClickItem}
        />
      </div>
    </HistoryLayout>
  );
};

export default HistoryContainer;
