import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectRequestPermissionLoading from '@assets/connect-request-permission-loading.svg';

const text = {
  title: 'Requesting Permission',
  desc: 'Please approve the connection request\nin your browser.',
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 50px;

  @keyframes rotate {
    from {
      -webkit-transform: rotate(0deg);
      -o-transform: rotate(0deg);
      transform: rotate(0deg);
    }
    to {
      -webkit-transform: rotate(360deg);
      -o-transform: rotate(360deg);
      transform: rotate(360deg);
    }
  }

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
    animation: rotate 1.5s infinite
  }

  div {
    text-align: center;
  }
`;

export const ConnectRequest = () => {

  return (
    <Wrapper>
      <img className='icon' src={IconConnectRequestPermissionLoading} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
      >
        <Text type='body1Bold'>Connect</Text>
      </Button>
    </Wrapper>
  );
};
