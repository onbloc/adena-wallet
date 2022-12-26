import React, { useEffect, useState } from 'react';
import { getStatusStyle } from '@common/utils/client-utils';
import styled from 'styled-components';
import Text from '@components/text';
import link from '../../../assets/share.svg';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { TransactionDetailInfo, useTransactionHistoryInfo } from '@hooks/use-transaction-history-info';
import { HistoryItemType } from 'gno-client/src/api/response';
import { useGnoClient } from '@hooks/use-gno-client';

interface DLProps {
  color?: string;
}

export const TransactionDetail = () => {
  const [gnoClient] = useGnoClient();
  const location = useLocation();
  const [transactionItem, setTransactionItem] = useState<HistoryItemType | undefined>();
  const navigate = useNavigate();
  const closeButtonClick = () => navigate(-1);
  const [{ getTransactionDetailInfo }] = useTransactionHistoryInfo();
  const [detailInfo, setDetailInfo] = useState<TransactionDetailInfo | undefined>();

  useEffect(() => {
    setTransactionItem(location.state);
  }, [location])

  useEffect(() => {
    if (transactionItem) {
      const detailInfo = getTransactionDetailInfo(transactionItem);
      setDetailInfo(detailInfo);
    }
  }, [transactionItem])


  const handleLinkClick = (hash: string) => {
    window.open(`${gnoClient?.linkUrl ?? 'https://gnoscan.io'}/transactions/${hash}`, '_blank');
  };

  return detailInfo ? (
    <Wrapper>
      <img className='status-icon' src={getStatusStyle(detailInfo.status).statusIcon} alt='status icon' />
      <TokenBox color={getStatusStyle(detailInfo.status).color}>
        <img className='tx-symbol' src={detailInfo.icon} alt='logo image' />
        <Text display={'flex'} className='main-text' type='header6'>
          {detailInfo.main}
          {detailInfo.msgNum > 1 && <Text type='body2Bold'>{` +${detailInfo.msgNum - 1}`}</Text>}
        </Text>
      </TokenBox>
      <DataBox>
        <DLWrap>
          <dt>Date</dt>
          <dd>{detailInfo.date}</dd>
        </DLWrap>
        <DLWrap>
          <dt>Type</dt>
          <dd>
            {detailInfo.type}
            {detailInfo.msgNum > 1 && <Text type='body3Bold'>{` +${detailInfo.msgNum - 1}`}</Text>}
          </dd>
        </DLWrap>
        <DLWrap color={getStatusStyle(detailInfo.status).color}>
          <dt>Status</dt>
          <StatusInfo>
            <dd>{detailInfo.status}</dd>
            <dd
              className='link-icon'
              onClick={() => transactionItem?.hash && handleLinkClick(transactionItem?.hash ?? '')}
            >
              <img src={link} alt='link' />
            </dd>
          </StatusInfo>
        </DLWrap>
        {detailInfo.transfer && (
          <DLWrap>
            <dt>{detailInfo.transfer.type}</dt>
            <dd>{detailInfo.transfer.address}</dd>
          </DLWrap>
        )}
        <DLWrap>
          <dt>Network Fee</dt>
          <dd>{detailInfo.networkFee}</dd>
        </DLWrap>
      </DataBox>
      <Button
        margin='auto 0px 0px'
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
        onClick={closeButtonClick}
      >
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  ) : <></>;
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  padding-top: 30px;
  .status-icon {
    width: 60px;
    height: 60px;
  }
`;

const TokenBox = styled.div<{ color: string }>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 70px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border: 1px solid ${({ color }) => color};
  border-radius: 18px;
  padding: 0px 15px;
  margin: 18px 0px 8px;
  .tx-symbol {
    width: 30px;
    height: 30px;
  }
  .main-text {
    align-items: center;
  }
`;

const DataBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'center')};
  width: 100%;
  border-radius: 18px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  margin-bottom: 24px;
`;

const DLWrap = styled.dl<DLProps>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${({ theme }) => theme.fonts.body1Reg};
  width: 100%;
  height: 40px;
  padding: 0px 18px;
  :not(:last-child) {
    border-bottom: 2px solid ${({ theme }) => theme.color.neutral[7]};
  }
  dd,
  dt {
    font: inherit;
  }
  dt {
    color: ${({ theme }) => theme.color.neutral[9]};
  }
  dd {
    display: flex;
    color: ${(props) => (props.color ? props.color : props.theme.color.neutral[0])};
    align-items: center;
  }
`;

const StatusInfo = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  .link-icon {
    display: flex;
    cursor: pointer;
    padding-left: 5px;
  }
`;
