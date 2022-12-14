import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectHardwareWallet from '../../../assets/connect-hardware-wallet.svg';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';

const text = {
  title: 'Connect a\nHardware Wallet',
  desc: 'Connect your ledger device to your\ncomputer and make sure that your\nwallet is unlocked.',
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 30px;

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`;

export const ApproveConnectHardwareWalletInit = () => {
  const navigate = useNavigate();

  const moveNextPage = () => {
    navigate(RoutePath.ApproveHardwareWalletConnect);
  }

  const onClickConnectButton = () => {
    moveNextPage();
  };

  return (
    <Wrapper>
      <img className='icon' src={IconConnectHardwareWallet} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        onClick={onClickConnectButton}
      >
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
