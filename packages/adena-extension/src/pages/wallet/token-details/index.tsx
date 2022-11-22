import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { LeftArrowBtn } from '@components/buttons/arrow-buttons';
import Text from '@components/text';
import etc from '../../../assets/etc.svg';
import ListWithDate from '@components/list-box/list-with-date';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DubbleButton from '@components/buttons/double-button';
import { StaticTooltip } from '@components/tooltips';
import theme from '@styles/theme';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useWalletBalances } from '@hooks/use-wallet-balances';
import { useGnoClient } from '@hooks/use-gno-client';
import { maxFractionDigits } from '@common/utils/client-utils';
import LoadingTokenDetails from '@components/loading-screen/loading-token-details';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useTransactionHistory } from '@hooks/use-transaction-history';

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 84px;
  overflow-y: auto;
  .gnot-title {
    width: 100%;
    text-align: center;
    margin: 0px auto;
  }
  .desc {
    position: absolute;
    bottom: 153px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
  }
`;

const HeaderWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
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
    background-color: ${({ theme }) => theme.color.neutral[3]};
    & > .static-tooltip {
      visibility: visible;
      transition: all 0.1s ease-in-out;
      transform: scale(1);
    }
  }
`;

export const TokenDetails = () => {
  const navigate = useNavigate();
  const [etcClicked, setEtcClicked] = useState(false);
  const handlePrevButtonClick = () => navigate(RoutePath.Wallet);
  const DepositButtonClick = () => navigate(RoutePath.Deposit, { state: 'token' });
  const SendButtonClick = () => navigate(RoutePath.GeneralSend, { state: 'token' });
  const historyItemClick = (item: any) => navigate(RoutePath.TransactionDetail, { state: item });
  const [currentAccount] = useCurrentAccount();
  const [balances] = useWalletBalances(true);
  const [gnoClient] = useGnoClient();

  const [balance, setBalance] = useState('');
  const [transactionHistory, setTransactionHistory] = useRecoilState(WalletState.transactionHistory);
  const [state, setState] = useState('FINISH');
  const [getHistory, updateLastHistory, updateNextHistory] = useTransactionHistory();
  const [nextFetch, setNextFetch] = useState(false);
  const [bodyElement, setBodyElement] = useState<HTMLBodyElement | undefined>();

  useEffect(() => {
    initHistory();
  }, [])

  const initHistory = async () => {
    await updateLastHistory();
  }

  useEffect(() => {
    if (transactionHistory.init === false) {
      setState('LOADING');
    } else {
      setState('FINISH');
    }
    setTransactionHistory({ ...transactionHistory, init: true });
  }, [transactionHistory.init])

  useEffect(() => {
    if (document.getElementsByTagName('body').length > 0) {
      setBodyElement(document.getElementsByTagName('body')[0]);
    }
  }, [document.getElementsByTagName('body')])

  useEffect(() => {
    bodyElement?.addEventListener('scroll', onScrollListener);
    return () => bodyElement?.removeEventListener('scroll', onScrollListener);
  }, [bodyElement]);

  useEffect(() => {
    if (nextFetch) {
      updateNextHistory().then(() =>
        setNextFetch(false))
    }
  }, [nextFetch]);

  const onScrollListener = async () => {
    if (bodyElement) {
      const remain = bodyElement.offsetHeight - bodyElement.scrollTop;
      if (remain < 60 && !nextFetch) {
        setNextFetch(true);
      }
    }
  }

  useEffect(() => {
    if (balances && balances.length > 0) {
      const currentBalance = maxFractionDigits(balances[0].amount ?? 0, 6);
      setBalance(currentBalance);
    }
  }, [balances]);

  const etcButtonClick = () => setEtcClicked((prev: boolean) => !prev);

  return (
    <Wrapper>
      <HeaderWrap>
        <LeftArrowBtn onClick={handlePrevButtonClick} />
        <Text type='header4'>Gnoland</Text>
        <EtcIcon className={etcClicked ? 'show-tooltip' : ''} onClick={etcButtonClick}>
          <img src={etc} alt='View on Gnoscan' />
          <StaticTooltip
            tooltipText='View on Gnoscan'
            bgColor={theme.color.neutral[3]}
            posTop='28px'
            onClick={() => {
              window.open(
                `https://gnoscan.io/${gnoClient?.chainId}/account/${currentAccount?.data.address}`,
                '_blank',
              );
            }}
          />
        </EtcIcon>
      </HeaderWrap>

      <Text className='gnot-title' type='title1'>{`${balance}\nGNOT`}</Text>
      <DubbleButton
        margin='28px 0px 25px'
        leftProps={{ onClick: DepositButtonClick, text: 'Deposit' }}
        rightProps={{
          onClick: SendButtonClick,
          text: 'Send',
        }}
      />
      {state === 'FINISH' ? (
        Object.keys(getHistory()).length > 0 ? (
          Object.keys(getHistory()).map((item, idx) => (
            <ListWithDate
              key={idx}
              date={item}
              transaction={getHistory()[item]}
              onClick={historyItemClick}
            />
          ))
        ) : (
          <Text className='desc' type='body1Reg' color={theme.color.neutral[9]}>
            No transaction to display
          </Text>
        )
      ) : (
        <LoadingTokenDetails />
      )}
    </Wrapper>
  );
};
