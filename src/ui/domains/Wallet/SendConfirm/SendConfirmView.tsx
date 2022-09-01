import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { DownArrowBtn, LeftArrowBtn } from '@ui/common/Button/ArrowButtons';
import Typography from '@ui/common/Typography';
import logo from '../../../../assets/gnot-logo.svg';
import { useNavigate, useLocation } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { inputStyle } from '@ui/common/DefaultInput';
import CancelAndConfirmButton from '@ui/common/Button/CancelAndConfirmButton';
import { useSdk } from '@services/client';

const data = {
  amount: '4,000',
  type: 'GNOT',
  receiver: 'Gno367463hd28g262j3g2378322hdcadbc13hh1232tygt',
  memo: '138254',
  feeAmount: '0.000001',
};

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
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

const ViewBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  border-radius: 18px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 0px 20px;
`;

const AmountViewBox = styled(ViewBox)`
  height: 70px;
  margin-bottom: 12px;
`;

const AddressViewBox = styled(ViewBox)`
  min-height: 82px;
  padding: 20px;
  overflow: hidden;
  margin: 12px 0px 20px;
  word-break: break-all;
`;

const NetworkFeeBox = styled.dl`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${inputStyle};
  border: 1px solid ${({ theme }) => theme.color.neutral[4]};
  dt {
    color: ${({ theme }) => theme.color.neutral[2]};
  }
`;

type LocationSend = {
  address: string;
  amount: number;
  from: string;
};

export const SendConfirmView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationSend;
  const [toaddress, setToaddress] = useState('');
  const [toamount, setToamount] = useState(0);
  const handlePrevButtonClick = () => navigate(-1);
  const cancelButtonClick = () =>
    state.from === 'token' ? navigate(RoutePath.TokenDetails) : navigate(RoutePath.Wallet);
  const { address, config, gnoClient: client, getSigner } = useSdk();
  useEffect(() => {
    setToaddress(state.address);
    setToamount(state.amount);
  }, []);
  const sendButtonClick = () => {
    (async () => {
      await client?.doContract(
        'bank',
        {
          to_address: toaddress,
          sendamount: `${toamount * 10 ** 6}${config.token.coinMinimalDenom}`,
        },
        address,
        getSigner(),
      );
    })();

    navigate(RoutePath.History);
  };
  return (
    <Wrapper>
      <HeaderWrap>
        <LeftArrowBtn onClick={handlePrevButtonClick} />
        <Typography type='header4'>Sending GNOT</Typography>
      </HeaderWrap>
      <AmountViewBox>
        <img src={logo} alt='logo' />
        <Typography type='header5'>{`${toamount && toamount} ${data.type}`}</Typography>
      </AmountViewBox>
      <DownArrowBtn onClick={() => {}} />
      <AddressViewBox>
        <Typography type='body2Reg'>{toaddress && toaddress}</Typography>
      </AddressViewBox>
      <NetworkFeeBox>
        <dt>Network Fee:</dt>
        <dd>{`${data.feeAmount} ${data.type}`}</dd>
      </NetworkFeeBox>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: cancelButtonClick }}
        confirmButtonProps={{
          onClick: sendButtonClick,
          text: 'Send',
        }}
      />
    </Wrapper>
  );
};
