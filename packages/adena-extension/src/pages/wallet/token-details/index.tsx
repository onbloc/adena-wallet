import React, { useCallback, useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import styled, { CSSProp } from 'styled-components';
import { useInfiniteQuery } from '@tanstack/react-query';

import { LeftArrowBtn } from '@components/buttons/arrow-buttons';
import Text from '@components/text';
import etc from '../../../assets/etc.svg';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DoubleButton from '@components/buttons/double-button';
import theme from '@styles/theme';
import { useCurrentAccount } from '@hooks/use-current-account';
import LoadingTokenDetails from '@components/loading-screen/loading-token-details';
import { useTokenBalance } from '@hooks/use-token-balance';
import { TransactionHistoryMapper } from '@repositories/transaction/mapper/transaction-history-mapper';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useAdenaContext } from '@hooks/use-context';
import TransactionHistory from '@components/transaction-history/transaction-history/transaction-history';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import HighlightNumber from '@components/common/highlight-number/highlight-number';
import useScrollHistory from '@hooks/use-scroll-history';
import { useNetwork } from '@hooks/use-network';
import { isGRC20TokenModel } from '@common/validation/validation-token';
import { StaticMultiTooltip } from '@components/tooltips/static-multi-tooltip';
import useHistoryData from '@hooks/use-history-data';
import { HISTORY_FETCH_INTERVAL_TIME } from '@common/constants/interval.constant';

import { TokenBalance } from '@types';

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 84px;
  overflow-y: auto;
  .gnot-title {
    width: 100%;
    text-align: center;
    margin: 0px auto;
    line-height: 36px;
  }
  .desc {
    position: absolute;
    bottom: 175px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
  }
  .balance-wrapper {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
  }
`;

const HeaderWrap = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
  position: relative;
  width: 100%;
  margin-bottom: 20px;
  & > button {
    position: absolute;
    left: 0;
  }
`;

const EtcIcon = styled.div`
  position: absolute;
  right: 0px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  &.show-tooltip {
    background-color: ${({ theme }): string => theme.color.neutral[6]};
    & > .static-tooltip {
      visibility: visible;
      transition: all 0.1s ease-in-out;
      transform: scale(1);
    }
  }
`;

type TokenHistoriesType = {
  hits: number;
  next: boolean;
  txs: {
    logo: string;
    amount: { value: string; denom: string };
    hash: string;
    type: 'TRANSFER' | 'ADD_PACKAGE' | 'CONTRACT_CALL' | 'MULTI_CONTRACT_CALL';
    typeName?: string | undefined;
    status: 'FAIL' | 'SUCCESS';
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
};

export const TokenDetails = (): JSX.Element => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [etcClicked, setEtcClicked] = useState(false);
  const { currentAccount, currentAddress } = useCurrentAccount();
  useNetwork();
  const [tokenBalance] = useState<TokenBalance>(state);
  const [balance] = useState(tokenBalance.amount.value);
  const { convertDenom, getTokenImageByDenom } = useTokenMetainfo();
  const { updateBalanceAmountByAccount } = useTokenBalance();
  const { transactionHistoryService } = useAdenaContext();
  const [bodyElement, setBodyElement] = useState<HTMLBodyElement | undefined>();
  const [loadingNextFetch, setLoadingNextFetch] = useState(false);
  const { saveScrollPosition } = useScrollHistory();
  const { clearHistoryData } = useHistoryData();
  const { status, isLoading, isFetching, data, refetch, fetchNextPage } = useInfiniteQuery(
    [
      'history/grc20-token-history',
      currentAddress,
      isGRC20TokenModel(tokenBalance) ? tokenBalance.pkgPath : '',
    ],
    ({ pageParam = 0 }) => fetchTokenHistories(pageParam),
    {
      getNextPageParam: (lastPage, allPosts) => {
        const from = allPosts.reduce((sum, { txs }) => sum + txs.length, 0);
        return lastPage.next ? from : undefined;
      },
    },
  );

  useEffect(() => {
    if (currentAccount) {
      updateBalanceAmountByAccount(currentAccount);
    }
  }, [currentAccount]);

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

  const fetchTokenHistories = async (pageParam: number): Promise<TokenHistoriesType> => {
    if (!currentAddress) {
      return {
        hits: 0,
        next: false,
        txs: [],
      };
    }
    const size = 20;
    const histories = isGRC20TokenModel(tokenBalance)
      ? await transactionHistoryService.fetchGRC20TransactionHistory(
          currentAddress,
          tokenBalance.pkgPath,
          pageParam,
          size,
        )
      : await transactionHistoryService.fetchNativeTransactionHistory(
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

  const handlePrevButtonClick = (): void => navigate(RoutePath.Wallet);
  const DepositButtonClick = (): void =>
    navigate(RoutePath.Deposit, { state: { type: 'token', tokenMetainfo: tokenBalance } });
  const SendButtonClick = (): void => {
    clearHistoryData(RoutePath.TransferInput);
    navigate(RoutePath.TransferInput, { state: { tokenBalance } });
  };
  const etcButtonClick = (): void => setEtcClicked((prev: boolean) => !prev);

  const getTransactionInfoLists = useCallback(() => {
    return TransactionHistoryMapper.queryToDisplay(data?.pages ?? []);
  }, [data]);

  const getAccountDetailUri = (): string => {
    return `https://gnoscan.io/accounts/${currentAddress}`;
  };

  const getTokenUri = (): string => {
    if (isGRC20TokenModel(tokenBalance)) {
      return `https://gnoscan.io/tokens/${tokenBalance.pkgPath}`;
    }
    return '';
  };

  const moveScanner = (uri: string): void => {
    window.open(uri, '_blank');
  };

  const getTooltipItems = (): { tooltipText: string; onClick: () => void }[] => {
    const accountDetailItem = {
      tooltipText: 'View on Gnoscan',
      onClick: () => moveScanner(getAccountDetailUri()),
    };
    if (!isGRC20TokenModel(tokenBalance)) {
      return [accountDetailItem];
    }
    const realmDetailItem = {
      tooltipText: 'Token Details',
      onClick: () => moveScanner(getTokenUri()),
    };
    return [accountDetailItem, realmDetailItem];
  };

  return (
    <Wrapper>
      <HeaderWrap>
        <LeftArrowBtn onClick={handlePrevButtonClick} />
        <Text type='header4'>{tokenBalance.name}</Text>
        <EtcIcon className={etcClicked ? 'show-tooltip' : ''} onClick={etcButtonClick}>
          <img src={etc} alt='View on Gnoscan' />
          <StaticMultiTooltip
            bgColor={theme.color.neutral[6]}
            posTop='28px'
            items={getTooltipItems()}
          />
        </EtcIcon>
      </HeaderWrap>

      <div className='balance-wrapper'>
        <HighlightNumber
          value={BigNumber(balance).toFormat()}
          fontColor={theme.color.neutral[0]}
          fontStyleKey={'header2'}
          minimumFontSize={'24px'}
        />
      </div>

      <DoubleButton
        margin='20px 0px 25px'
        leftProps={{ onClick: DepositButtonClick, text: 'Deposit' }}
        rightProps={{
          onClick: SendButtonClick,
          text: 'Send',
        }}
      />
      {isLoading ? (
        <LoadingTokenDetails />
      ) : getTransactionInfoLists().length > 0 ? (
        <TransactionHistory
          status={status}
          transactionInfoLists={getTransactionInfoLists()}
          onClickItem={onClickItem}
        />
      ) : (
        <Text className='desc' type='body1Reg' color={theme.color.neutral[9]}>
          No transaction to display
        </Text>
      )}
    </Wrapper>
  );
};
