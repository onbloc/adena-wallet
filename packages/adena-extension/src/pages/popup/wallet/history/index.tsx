import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { TransactionHistory } from '@components/molecules';
import { RoutePath } from '@types';
import { TransactionHistoryMapper } from '@repositories/transaction/mapper/transaction-history-mapper';
import useScrollHistory from '@hooks/use-scroll-history';
import { fonts } from '@styles/theme';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';
import { useTransactionHistory } from '@hooks/wallet/transaction-history/use-transaction-history';
import { useCurrentAccount } from '@hooks/use-current-account';
import { HISTORY_FETCH_INTERVAL_TIME } from '@common/constants/interval.constant';

const StyledHistoryLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: calc(100vh - 48px - 60px);
  padding: 24px 20px;
  overflow: auto;
`;

const StyledTitleWrapper = styled.div`
  margin-bottom: 12px;
`;

const StyledTitle = styled.span`
  ${fonts.header4};
`;

const HistoryContainer: React.FC = () => {
  const { navigate } = useAppNavigate();
  const [bodyElement, setBodyElement] = useState<HTMLBodyElement | undefined>();
  const { currentAddress } = useCurrentAccount();
  const [loadingNextFetch, setLoadingNextFetch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { saveScrollPosition } = useScrollHistory(scrollRef);

  const { isSupported, status, isLoading, isFetching, data, fetchNextPage, refetch } =
    useTransactionHistory();

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
    if (currentAddress) {
      const historyFetchTimer = setInterval(() => {
        refetch();
      }, HISTORY_FETCH_INTERVAL_TIME);
      return (): void => clearInterval(historyFetchTimer);
    }
  }, [currentAddress]);

  const onScrollListener = (): void => {
    if (bodyElement && scrollRef.current) {
      const scrollHeight = scrollRef.current.clientHeight + scrollRef.current.scrollTop;
      const remain = (scrollRef.current.lastElementChild?.clientHeight || 0) - scrollHeight;
      if (remain < 20) {
        setLoadingNextFetch(true);
      }
    }
  };

  const onClickItem = useCallback(
    (hash: string) => {
      const transactions =
        TransactionHistoryMapper.queryToDisplay(data || []).flatMap(
          (group) => group.transactions,
        ) ?? [];
      const transactionInfo = transactions.find((transaction) => transaction.hash === hash);
      if (transactionInfo) {
        saveScrollPosition(scrollRef.current?.scrollTop || 0);
        navigate(RoutePath.TransactionDetail, {
          state: { transactionInfo },
        });
      }
    },
    [data, bodyElement],
  );

  return (
    <StyledHistoryLayout ref={scrollRef} onScroll={onScrollListener}>
      <StyledTitleWrapper>
        <StyledTitle>History</StyledTitle>
      </StyledTitleWrapper>
      <TransactionHistory
        status={isSupported ? status : 'error'}
        transactionInfoLists={data ? TransactionHistoryMapper.queryToDisplay(data) : []}
        onClickItem={onClickItem}
      />
    </StyledHistoryLayout>
  );
};

export default HistoryContainer;
