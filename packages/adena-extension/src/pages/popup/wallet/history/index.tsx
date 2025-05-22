import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import { HISTORY_FETCH_INTERVAL_TIME } from '@common/constants/interval.constant';
import { TransactionHistory } from '@components/molecules';
import { useGetAllGRC721Collections } from '@hooks/nft/use-get-all-grc721-collections';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import useAppNavigate from '@hooks/use-app-navigate';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import useScrollHistory from '@hooks/use-scroll-history';
import { useTransactionHistory } from '@hooks/wallet/transaction-history/use-transaction-history';
import { useTransactionHistoryPage } from '@hooks/wallet/transaction-history/use-transaction-history-page';
import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';
import { RoutePath } from '@types';

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
  const { currentNetwork } = useNetwork();

  useGetAllGRC721Collections({ refetchOnMount: true });

  const isUsedApi = useMemo(() => {
    return !!currentNetwork.apiUrl;
  }, [currentNetwork]);

  const pageTransactionHistoryQuery = useTransactionHistoryPage({ enabled: isUsedApi });
  const commonTransactionHistoryQuery = useTransactionHistory({ enabled: !isUsedApi });

  const transactionHistoryQuery = useMemo(() => {
    if (isUsedApi) {
      return pageTransactionHistoryQuery;
    }
    return commonTransactionHistoryQuery;
  }, [isUsedApi, commonTransactionHistoryQuery, pageTransactionHistoryQuery]);

  const { isSupported, isFetching, isLoading, status, data, hasNextPage, fetchNextPage, refetch } =
    transactionHistoryQuery;

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (loadingNextFetch && !isLoading && !isFetching && hasNextPage) {
      fetchNextPage().then(() => setLoadingNextFetch(false));
    }
  }, [loadingNextFetch, isLoading, isFetching, hasNextPage]);

  useEffect(() => {
    if (document.getElementsByTagName('body') && document.getElementsByTagName('body').length > 0) {
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
      const transactions = data?.flatMap((group) => group.transactions) ?? [];
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
        transactionInfoLists={data || []}
        queryGRC721TokenUri={useGetGRC721TokenUri}
        onClickItem={onClickItem}
      />
    </StyledHistoryLayout>
  );
};

export default HistoryContainer;
