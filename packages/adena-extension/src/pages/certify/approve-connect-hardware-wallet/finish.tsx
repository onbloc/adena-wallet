import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectHardwareWallet from './../../../assets/connect-hardware-wallet.svg';

const text = {
  title: 'Connect a\nHardware Wallet',
  desc: 'Connect your ledger device to your\ncomputer and make sure that your\nwallet is unlocked.',
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 50px;
`;

export const ApproveConnectHardwareWalletFinish = () => {

  return (
    <Wrapper>
      <IconConnectHardwareWallet />
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
