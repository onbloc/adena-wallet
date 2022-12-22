import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectFailPermission from '@assets/connect-fail-permission.svg';

const text = {
  title: 'Connection Failed',
  desc: 'We couldn’t connect to your ledger\ndevice. Please ensure that your device\nis unlocked.',
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
  retry: () => void;
}

export const ConnectFail = ({ retry }: Props) => {

  return (
    <Wrapper>
      <img className='icon' src={IconConnectFailPermission} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        onClick={retry}
      >
        <Text type='body1Bold'>Retry</Text>
      </Button>
    </Wrapper>
  );
};
