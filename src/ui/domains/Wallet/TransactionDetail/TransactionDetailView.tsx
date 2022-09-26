import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useStatus } from './useStatus';
import Typography, { textVariants } from '@ui/common/Typography';
import link from '../../../../assets/share.svg';
import FullButton from '@ui/common/Button/FullButton';
import { useLocation, useNavigate } from 'react-router-dom';

interface DLProps {
  color?: string;
}

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 30px;
`;

const TokenBox = styled.div<{ color: string }>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 70px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border: 1px solid ${({ color }) => color};
  border-radius: 18px;
  padding: 0px 15px;
  margin: 16px 0px 12px;
`;

const DataBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'center')};
  width: 100%;
  border-radius: 18px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  margin-bottom: auto;
`;

const DLWrap = styled.dl<DLProps>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${textVariants.body1Reg};
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
    color: ${({ theme }) => theme.color.neutral[2]};
  }
  dd {
    color: ${(props) => (props.color ? props.color : props.theme.color.neutral[0])};
  }
`;

const StatusInfo = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  .status-icon {
    display: flex;
    cursor: pointer;
    padding-left: 5px;
  }
`;

const removeUgly = (target: any) => {
  return target.replace('To: ', '').replace('From: ', '').replace('/std.', '');
};

export const TransactionDetailView = () => {
  const { modelState, onLinkClick, setTx } = useStatus();
  const { date, type, status, fee, img, send } = modelState.model;
  const navigate = useNavigate();
  const closeButtonClick = () => navigate(-1);
  const location = useLocation();

  const [txType, setTxType] = useState();
  const [txFunc, setTxFunc] = useState();
  const [txDesc, setTxDesc] = useState();
  const [txReason, setTxReason] = useState();
  const [txHash, setTxHash] = useState<string>('');

  useEffect(() => {
    const state = location.state as any;
    console.log('state', state);

    setTx(state);
    setTxDesc(state.txDesc);
    setTxType(state.txType);
    setTxFunc(state.txFunc);
    setTxReason(state.txReason);
    setTxHash(state.protoType.hash);
  }, []);

  return (
    <Wrapper>
      <img src={modelState.statusIcon} alt='status icon' />
      <TokenBox color={modelState.color}>
        <img src={img} alt='logo image' />
        <Typography type='header6'>{`${send} GNOT`}</Typography>
      </TokenBox>
      {/* Common */}
      <DataBox>
        <DLWrap>
          <dt>Date</dt>
          <dt>{date}</dt>
        </DLWrap>
        {/*DataBox Cond*/}
        {txType === '/bank.MsgSend' && txFunc === 'Sent' && (
          <>
            <DLWrap>
              <dt>Type</dt>
              <dt>{txFunc}</dt>
            </DLWrap>
            <DLWrap>
              <dt>To</dt>
              <dt>{removeUgly(txDesc)}</dt>
            </DLWrap>
          </>
        )}

        {txType === '/bank.MsgSend' && txFunc === 'Received' && (
          <>
            <DLWrap>
              <dt>Type</dt>
              <dt>{txFunc}</dt>
            </DLWrap>
            <DLWrap>
              <dt>From</dt>
              <dt>{removeUgly(txDesc)}</dt>
            </DLWrap>
          </>
        )}

        {txType === '/vm.m_call' && (
          <>
            <DLWrap>
              <dt>Type</dt>
              {/*<dt>{txType}</dt>*/}
              <dt>Contract Execution</dt>
            </DLWrap>
            <DLWrap>
              <dt>Func</dt>
              <dt>{txFunc}</dt>
            </DLWrap>
          </>
        )}

        {txType === '/vm.m_addpkg' && (
          <>
            <DLWrap>
              <dt>Type</dt>
              {/*<dt>{txType}</dt>*/}
              <dt>Contract Deploy</dt>
            </DLWrap>
            <DLWrap>
              <dt>Func</dt>
              <dt>AddPkg</dt>
            </DLWrap>
          </>
        )}
        {/* Common */}
        <DLWrap color={modelState.color}>
          <dt>Status</dt>
          <StatusInfo>
            <dd>{status}</dd>
            <dd className='status-icon' onClick={() => onLinkClick(txHash)}>
              <img src={link} alt='link' />
            </dd>
          </StatusInfo>
        </DLWrap>
        {status === 'Failed' && (
          <>
            <DLWrap color={modelState.color}>
              <dt>Reason</dt>
              <dt>{removeUgly(txReason)}</dt>
            </DLWrap>
          </>
        )}
        <DLWrap>
          <dt>Network&nbsp;Fee</dt>
          <dd>{fee} GNOT</dd>
        </DLWrap>
      </DataBox>
      &nbsp;
      <FullButton mode='dark' onClick={closeButtonClick}>
        <Typography type='body1Bold'>Close</Typography>
      </FullButton>
    </Wrapper>
  );
};
/*
{
  "nftImg": "chrome-extension://ljjmekmafeigdnifekogppfknapdcmlc/assets/gnot-logo.svg",
  "nftType": "",
  "account": "g1e...v3a",
  "amount": "-1.000000",
  "addr": "g1enmqv8h3lz8aydch3p5uvhv725xwucvzy4zv3a",
  "protoType": {
      "result_type": "valid_tx",
      "time": "2022-07-14T07:32:55.874386674Z",
      "from": "g1enmqv8h3lz8aydch3p5uvhv725xwucvzy4zv3a",
      "to": "g1enmqv8h3lz8aydch3p5uvhv725xwucvzy4zv3a",
      "amount": "-1.0gnot"
  }
}
*/
