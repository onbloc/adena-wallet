import React from 'react';
import styled from 'styled-components';

import { Text, Button, ButtonHierarchy } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import IconConnectFailPermission from '@assets/connect-fail-permission.svg';
import mixins from '@styles/mixins';

const text = {
  title: 'Connection Failed',
  desc: 'We couldn’t connect to your ledger\ndevice. Please ensure that your device\nis unlocked.',
};

const Wrapper = styled.main`
  ${mixins.flex('column', 'center', 'flex-start')};
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
  retry: () => void;
}

export const ConnectFail = ({ retry }: Props): JSX.Element => {
  return (
    <Wrapper>
      <img className='icon' src={IconConnectFailPermission} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} margin='auto 0px 0px' onClick={retry}>
        <Text type='body1Bold'>Retry</Text>
      </Button>
    </Wrapper>
  );
};
