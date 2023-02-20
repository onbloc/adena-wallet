import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { DownArrowBtn, LeftArrowBtn } from '@components/buttons/arrow-buttons';
import Text from '@components/text';
import logo from '../../../assets/gnot-logo.svg';
import { useNavigate, useLocation } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { inputStyle } from '@components/default-input';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGnoClient } from '@hooks/use-gno-client';
import { TransactionMessage, TransactionService } from '@services/index';
import { SendConfirmLedgerLoading } from './ledger-loading';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { useAdenaContext } from '@hooks/use-context';
import BigNumber from 'bignumber.js';

const data = {
  amount: '4,000',
  type: 'GNOT',
  receiver: 'Gno367463hd28g262j3g2378322hdcadbc13hh1232tygt',
  memo: '138254',
  feeAmount: '0.000001',
};

type LocationSend = {
  name: string;
  address: string;
  amount: number;
  from: string;
};

export const SendConfirm = () => {
  const { transactionService } = useAdenaContext();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationSend;
  const [toname, setToname] = useState('');
  const [toaddress, setToaddress] = useState('');
  const [toamount, setToamount] = useState(0);
  const handlePrevButtonClick = () => navigate(-1);
  const cancelButtonClick = () =>
    state.from === 'token' ? navigate(RoutePath.TokenDetails) : navigate(RoutePath.Wallet);
  const [currentAccount] = useCurrentAccount();
  const [sendState, setSendState] = useState('INIT');
  const [gnoClient] = useGnoClient();
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  useEffect(() => {
    setToaddress(state.address);
    setToamount(state.amount);
    setToname(state.name);
  }, [state]);

  useEffect(() => {
    if (sendState === 'SEND') {
      sendBySigner();
    }
  }, [sendState]);

  const sendBySigner = () => {
    if (currentAccount?.data.signerType === 'LEDGER') {
      setIsLoadingLedger(true);
    } else {
      sendToken().then(() => navigate(RoutePath.History));
    }
  };

  const sendButtonClick = async () => {
    if (sendState === 'INIT') {
      setSendState('SEND');
    }
  };

  const cancelLedger = async () => {
    const connected = await TransportWebUSB.openConnected();
    await connected?.close();
    setIsLoadingLedger(false);
    setSendState('INIT');
  };

  const sendToken = async () => {
    if (gnoClient && currentAccount) {
      const gasWanted = 60000;
      const fromAddress = currentAccount.getAddress() || '';
      const sendAmount = `${BigNumber(toamount).multipliedBy(10 ** 6)}${'ugnot'}`;
      const message = TransactionMessage.createMessageOfBankSend({
        fromAddress,
        toAddress: toaddress,
        amount: sendAmount,
      });
      const gasFeeAmount = 1;
      const transaction = await transactionService.createTransaction(
        currentAccount,
        message,
        gasWanted,
        gasFeeAmount
      );
      await transactionService.sendTransaction(transaction);
    }
  };

  return isLoadingLedger ?
    <SendConfirmLedgerLoading sendToken={sendToken} cancel={cancelLedger} /> :
    (
      <Wrapper>
        <HeaderWrap>
          <LeftArrowBtn onClick={handlePrevButtonClick} />
          <Text type='header4'>Sending GNOT</Text>
        </HeaderWrap>
        <AmountViewBox>
          <img src={logo} alt='logo' />
          <Text type='header5'>{`${toamount && toamount} ${data.type}`}</Text>
        </AmountViewBox>
        <DownArrowBtn />
        <AddressViewBox>
          {toname ? (
            <Text type='body2Reg' className='name-with-address'>
              {toname}
              <span>{toaddress && ` (${toaddress})`}</span>
            </Text>
          ) : (
            <Text type='body2Reg'>{toaddress}</Text>
          )}
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

const Wrapper = styled.main`
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
  .name-with-address {
    overflow: hidden;
    display: inline-block;
    & > span {
      color: ${({ theme }) => theme.color.neutral[9]};
    }
  }
`;

const NetworkFeeBox = styled.dl`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${inputStyle};
  border: 1px solid ${({ theme }) => theme.color.neutral[6]};
  dt {
    color: ${({ theme }) => theme.color.neutral[9]};
  }
`;
