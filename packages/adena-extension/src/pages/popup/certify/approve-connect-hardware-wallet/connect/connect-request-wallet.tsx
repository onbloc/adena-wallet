import React from 'react';
import styled from 'styled-components';

import { Text, Button } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import IconConnectRequestHardwareWallet from '@assets/connect-request-hardware-wallet.svg';
import mixins from '@styles/mixins';

const text = {
  title: 'Open Cosmos App\nin Your Ledger',
  desc: 'Please make sure the Cosmos App is\nopened in your ledger device.',
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
  margin: 0 auto;

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
  onClickClose: () => void;
}

export const ConnectRequestWallet: React.FC<Props> = ({ onClickClose }) => {
  return (
    <Wrapper>
      <img className='icon' src={IconConnectRequestHardwareWallet} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button fullWidth hierarchy='dark' margin='auto 0px 0px' onClick={onClickClose}>
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  );
};
