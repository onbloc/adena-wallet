import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectRequestHardwareWallet from '@assets/connect-request-hardware-wallet.svg';

const text = {
  title: 'Open Cosmos App\nin Your Ledger',
  desc: 'Please make sure the Cosmos App is\nopened in your ledger device.',
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 50px;
  
  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`;

interface Props {
  active: boolean;
  retry: () => void;
}

export const ConnectRequestWallet = ({ active, retry }: Props) => {

  return (
    <Wrapper>
      <img className='icon' src={IconConnectRequestHardwareWallet} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        onClick={retry}
        disabled={!active}
      >
        <Text type='body1Bold'>Retry</Text>
      </Button>
    </Wrapper>
  );
};
