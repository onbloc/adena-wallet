import React, { useEffect, useState } from 'react';
import { getDateTimeText, getStatusStyle } from '@common/utils/client-utils';
import styled from 'styled-components';
import Text from '@components/text';
import link from '../../../assets/share.svg';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGnoClient } from '@hooks/use-gno-client';
import { TransactionInfo } from '@components/transaction-history/transaction-history/transaction-history';
import TokenBalance from '@components/common/token-balance/token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';

interface DLProps {
  color?: string;
}

export const TransactionDetail = () => {
  const [gnoClient] = useGnoClient();
  const { convertDenom } = useTokenMetainfo();
  const location = useLocation();
  const [transactionItem, setTransactionItem] = useState<TransactionInfo>();
  const navigate = useNavigate();
  const closeButtonClick = () => navigate(-1);

  useEffect(() => {
    setTransactionItem(location.state);
  }, [location])


  const handleLinkClick = (hash: string) => {
    window.open(`${gnoClient?.linkUrl ?? 'https://gnoscan.io'}/transactions/${hash}`, '_blank');
  };

  return transactionItem ? (
    <Wrapper>
      <img className='status-icon' src={getStatusStyle(transactionItem.status).statusIcon} alt='status icon' />
      <TokenBox color={getStatusStyle(transactionItem.status).color}>
        <img className='tx-symbol' src={transactionItem.logo} alt='logo image' />
        {transactionItem.type === 'TRANSFER' ? (
          <TokenBalance
            value={transactionItem.amount.value || '0'}
            denom={transactionItem.amount.denom || '0'}
            fontStyleKey='header6'
            minimumFontSize='14px'
            orientation='HORIZONTAL'
          />
        ) : (
          <Text display={'flex'} className='main-text' type='header6'>
            {transactionItem.title}
            {transactionItem.extraInfo && <Text type='body2Bold'>{transactionItem.extraInfo}</Text>}
          </Text>
        )}
      </TokenBox>
      <DataBox>
        <DLWrap>
          <dt>Date</dt>
          <dd>{getDateTimeText(transactionItem.date)}</dd>
        </DLWrap>
        <DLWrap>
          <dt>Type</dt>
          <dd>
            {transactionItem.typeName || ''}
            {transactionItem.extraInfo && <Text type='body3Bold'>{transactionItem.extraInfo}</Text>}
          </dd>
        </DLWrap>
        <DLWrap color={getStatusStyle(transactionItem.status).color}>
          <dt>Status</dt>
          <StatusInfo>
            <dd>{transactionItem.status === 'SUCCESS' ? 'Success' : 'Fail'}</dd>
            <dd
              className='link-icon'
              onClick={() => transactionItem.hash && handleLinkClick(transactionItem.hash ?? '')}
            >
              <img src={link} alt='link' />
            </dd>
          </StatusInfo>
        </DLWrap>
        {transactionItem.type === 'TRANSFER' && (
          <DLWrap>
            <dt>{
              transactionItem.title === 'Send' ?
                'To' :
                'From'
            }</dt>
            <dd>{
              transactionItem.title === 'Send' ?
                transactionItem.to :
                transactionItem.from
            }</dd>
          </DLWrap>
        )}
        {
          transactionItem.networkFee && (
            <DLWrap>
              <dt>Network Fee</dt>
              <dd>
                <TokenBalance
                  {...convertDenom(
                    transactionItem.networkFee.value,
                    transactionItem.networkFee.denom)
                  }
                  fontStyleKey='body1Reg'
                  orientation='HORIZONTAL'
                />
              </dd>
            </DLWrap>
          )
        }
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
