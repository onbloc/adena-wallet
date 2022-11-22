import React, { useEffect, useState } from 'react';
import { fullDateFormat, getStatusStyle } from '@common/utils/client-utils';
import styled from 'styled-components';
import useStatus, { ResultTxStateType } from './use-status';
import Text from '@components/text';
import link from '../../../assets/share.svg';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatAddress } from '@common/utils/client-utils';
import { useTransactionHistoryInfo } from '@hooks/use-transaction-history-info';
import { HistoryItem } from 'gno-client/src/api/response';
import { useGnoClient } from '@hooks/use-gno-client';

interface DLProps {
  color?: string;
}

export const TransactionDetail = () => {
  const [gnoClient] = useGnoClient();
  const location = useLocation();
  const [transactionItem, setTransactionItem] = useState<HistoryItem | undefined>();
  // const { initTxState, handleLinkClick } = useStatus();
  const navigate = useNavigate();
  const closeButtonClick = () => navigate(-1);
  // const [txData, setTxData] = useState<ResultTxStateType | null>(() => initTxState(state));

  useEffect(() => {
    setTransactionItem(location.state);
  }, [location])

  const [{
    getIcon,
    getFunctionName,
    getTransferInfo,
    getAmountFullValue,
    getNetworkFee,
  }] = useTransactionHistoryInfo();

  const handleLinkClick = (hash: string) => {
    window.open(`https://gnoscan.io/${gnoClient?.chainId ?? ''}/contract/${hash}`, '_blank');
  };

  return transactionItem ? (
    <Wrapper>
      <img className='status-icon' src={getStatusStyle(transactionItem.result.status ?? '').statusIcon} alt='status icon' />
      <TokenBox color={getStatusStyle(transactionItem.result?.status ?? '').color ?? ''}>
        <img className='tx-symbol' src={getIcon(transactionItem)} alt='logo image' />
        <Text type='header6'>{getAmountFullValue(transactionItem)}</Text>
      </TokenBox>
      <DataBox>
        <DLWrap>
          <dt>Date</dt>
          <dd>{fullDateFormat(transactionItem.date)}</dd>
        </DLWrap>
        <DLWrap>
          <dt>Type</dt>
          <dd>{getFunctionName(transactionItem)}</dd>
        </DLWrap>
        <DLWrap color={getStatusStyle(transactionItem.result?.status ?? '').color ?? ''}>
          <dt>Status</dt>
          <StatusInfo>
            <dd>{transactionItem.result.status}</dd>
            <dd
              className='link-icon'
              onClick={() => transactionItem.hash && handleLinkClick(transactionItem.hash)}
            >
              <img src={link} alt='link' />
            </dd>
          </StatusInfo>
        </DLWrap>
        {getTransferInfo(transactionItem) !== null && (
          <DLWrap>
            <dt>{getTransferInfo(transactionItem)?.transferType}</dt>
            <dd>{formatAddress(getTransferInfo(transactionItem)?.transferAddress ?? '')}</dd>
          </DLWrap>
        )}
        <DLWrap>
          <dt>Network Fee</dt>
          <dd>{getNetworkFee(transactionItem)}</dd>
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
    color: ${(props) => (props.color ? props.color : props.theme.color.neutral[0])};
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
