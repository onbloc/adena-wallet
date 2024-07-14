import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BigNumber from 'bignumber.js';
import styled, { useTheme } from 'styled-components';
import { isAirgapAccount } from 'adena-module';

import { Text, StaticMultiTooltip, LeftArrowBtn } from '@components/atoms';
import { TransactionHistory, DoubleButton } from '@components/molecules';
import etc from '@assets/etc.svg';
import { RoutePath } from '@types';
import { getTheme } from '@styles/theme';
import { useCurrentAccount } from '@hooks/use-current-account';
import { TransactionHistoryMapper } from '@repositories/transaction/mapper/transaction-history-mapper';
import { HighlightNumber } from '@components/atoms';
import useScrollHistory from '@hooks/use-scroll-history';
import { isGRC20TokenModel } from '@common/validation/validation-token';
import useHistoryData from '@hooks/use-history-data';

import LoadingTokenDetails from './loading-token-details';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import useSessionParams from '@hooks/use-session-state';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useTokenTransactions } from '@hooks/wallet/token-details/use-token-transactions';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
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
  ${mixins.flex({ direction: 'row' })};
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
    background-color: ${getTheme('neutral', '_7')};
    & > .static-tooltip {
      visibility: visible;
      transition: all 0.1s ease-in-out;
      transform: scale(1);
    }
  }
`;

export const TokenDetails = (): JSX.Element => {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { saveScrollPosition } = useScrollHistory(scrollRef);
  const { openLink } = useLink();
  const { navigate } = useAppNavigate<RoutePath.TokenDetails>();
  const { params } = useSessionParams<RoutePath.TokenDetails>();
  const [etcClicked, setEtcClicked] = useState(false);
  const { currentAccount, currentAddress } = useCurrentAccount();
  const tokenBalance = params?.tokenBalance;
  const [bodyElement, setBodyElement] = useState<HTMLBodyElement | undefined>();
  const [loadingNextFetch, setLoadingNextFetch] = useState(false);
  const { clearHistoryData } = useHistoryData();
  const { currentBalances } = useTokenBalance();

  const isNative = tokenBalance && !isGRC20TokenModel(tokenBalance);

  const { status, isLoading, isFetching, data, isSupported, fetchNextPage } = useTokenTransactions(
    isNative,
    tokenBalance && isGRC20TokenModel(tokenBalance) ? tokenBalance.pkgPath : '',
  );

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

  const tokenAmount = useMemo((): string => {
    const balance = currentBalances.find((balance) => balance.tokenId === tokenBalance?.tokenId);
    return balance?.amount ? BigNumber(balance.amount.value).toFormat() : '0';
  }, [currentBalances, tokenBalance]);

  const transactions = useMemo(() => {
    return TransactionHistoryMapper.queryToDisplay(data || []);
  }, [data]);

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
        TransactionHistoryMapper.queryToDisplay(data ?? []).flatMap(
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

  const handlePrevButtonClick = (): void => navigate(RoutePath.Wallet);
  const DepositButtonClick = (): void => {
    if (!tokenBalance) {
      return;
    }
    navigate(RoutePath.Deposit, { state: { type: 'token', tokenMetainfo: tokenBalance } });
  };

  const SendButtonClick = (): void => {
    if (!currentAccount || !tokenBalance) {
      return;
    }
    clearHistoryData(RoutePath.TransferInput);
    if (isAirgapAccount(currentAccount)) {
      navigate(RoutePath.BroadcastTransaction);
      return;
    }
    navigate(RoutePath.TransferInput, { state: { tokenBalance } });
  };
  const etcButtonClick = (): void => setEtcClicked((prev: boolean) => !prev);

  const getAccountDetailUri = (): string => {
    return `https://gnoscan.io/accounts/${currentAddress}`;
  };

  const getTokenUri = (): string => {
    if (tokenBalance && isGRC20TokenModel(tokenBalance)) {
      return `https://gnoscan.io/tokens/${tokenBalance.pkgPath}`;
    }
    return '';
  };

  const getTooltipItems = (): { tooltipText: string; onClick: () => void }[] => {
    const accountDetailItem = {
      tooltipText: 'View on Gnoscan',
      onClick: () => openLink(getAccountDetailUri()),
    };
    if (tokenBalance && !isGRC20TokenModel(tokenBalance)) {
      return [accountDetailItem];
    }
    const realmDetailItem = {
      tooltipText: 'Token Details',
      onClick: () => openLink(getTokenUri()),
    };
    return [accountDetailItem, realmDetailItem];
  };

  return (
    <Wrapper ref={scrollRef} onScroll={onScrollListener}>
      <HeaderWrap>
        <LeftArrowBtn onClick={handlePrevButtonClick} />
        <Text type='header4'>{tokenBalance?.name}</Text>
        <EtcIcon className={etcClicked ? 'show-tooltip' : ''} onClick={etcButtonClick}>
          <img src={etc} alt='View on Gnoscan' />
          <StaticMultiTooltip bgColor={theme.neutral._7} posTop='28px' items={getTooltipItems()} />
        </EtcIcon>
      </HeaderWrap>

      <div className='balance-wrapper'>
        <HighlightNumber
          value={tokenAmount}
          fontColor={theme.neutral._1}
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
      {isLoading && isSupported ? (
        <LoadingTokenDetails />
      ) : transactions.length > 0 ? (
        <TransactionHistory
          status={status}
          transactionInfoLists={isSupported ? transactions : []}
          onClickItem={onClickItem}
        />
      ) : (
        <Text className='desc' type='body1Reg' color={theme.neutral.a}>
          No transaction to display
        </Text>
      )}
    </Wrapper>
  );
};
