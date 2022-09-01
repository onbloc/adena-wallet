import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useStatus } from './useStatus';
import Typography, { textVariants } from '@ui/common/Typography';
import link from '../../../../assets/share.svg';
import FullButton from '@ui/common/Button/FullButton';
import { useLocation, useNavigate } from 'react-router-dom';
import theme from '@styles/theme';

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

export const TransactionDetailView = () => {
  const { modelState, onLinkClick, setTx } = useStatus();
  const { date, type, status, fromto, fromtoaddr, networkFee, tokenImg, price } = modelState.model;
  const navigate = useNavigate();
  const closeButtonClick = () => navigate(-1);
  const location = useLocation();

  useEffect(() => {
    const state = location.state as any;
    setTx(state);
  }, []);

  return (
    <Wrapper>
      <img src={modelState.statusIcon} alt='status icon' />
      <TokenBox color={modelState.color}>
        <img src={tokenImg} alt='logo image' />
        <Typography type='header6'>{`${price} GNOT`}</Typography>
      </TokenBox>
      <DataBox>
        <DLWrap>
          <dt>Date</dt>
          <dd>{date}</dd>
        </DLWrap>
        <DLWrap>
          <dt>Type</dt>
          <dd>{type}</dd>
        </DLWrap>
        <DLWrap color={modelState.color}>
          <dt>Status</dt>
          <StatusInfo>
            <dd>{status}</dd>
            <dd className='status-icon' onClick={onLinkClick}>
              <img src={link} alt='link' />
            </dd>
          </StatusInfo>
        </DLWrap>
        <DLWrap>
          <dt>{fromto}</dt>
          <dd>{fromtoaddr}</dd>
        </DLWrap>
        <DLWrap>
          <dt>Network&nbsp;Fee</dt>
          <dd>{networkFee} GNOT</dd>
        </DLWrap>
      </DataBox>
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
