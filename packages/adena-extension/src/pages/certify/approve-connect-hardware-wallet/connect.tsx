import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectHardwareWallet from './../../../assets/connect-hardware-wallet.svg';
import { Wallet } from 'adena-module';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { HandlerMethod } from '@inject/message';
import { RoutePath } from '@router/path';

const text = {
  title: 'Requesting Permission',
  desc: 'Connect your ledger device to your\ncomputer and make sure that your\nwallet is unlocked.',
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 50px;
`;

export const ApproveConnectHardwareWalletConnect = () => {

  const [connectState, setConnectState] = useState<'INIT' | 'REQUEST' | 'NOT_PERMISSION' | 'REQUEST_WALLET' | 'FAILED' | 'SUCCESS'>('INIT');

  useEffect(() => {
    if (connectState === 'INIT') {
      initWallet();
    } else if (connectState === 'FAILED') {
      requestHardwareWallet();
    }
  }, [connectState]);

  const initWallet = async () => {
    setConnectState('REQUEST');
    const isPermission = await requestPermission();
    if (!isPermission) {
      return;
    }

    await requestHardwareWallet();
  };

  const requestPermission = async () => {
    try {
      await TransportWebUSB.request();
      return true;
    } catch (e) {
      setConnectState('NOT_PERMISSION');
    }
    return false;
  };

  const requestHardwareWallet = async () => {
    console.log('??')
    setConnectState('REQUEST_WALLET');
    try {
      const wallet = await Wallet.createByLedger([0, 1, 2, 4, 5, 6, 7, 8, 9, 10]);
      await wallet.initAccounts();
      console.log(wallet.getAccounts())
      setConnectState('SUCCESS');
    } catch (e) {
      console.log(e)
      setTimeout(() => {
        setConnectState('FAILED');
      }, 1000);
    }
  };

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
      >
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
