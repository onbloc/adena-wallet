import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectRequestPermissionLoading from '@assets/connect-request-permission-loading.svg';

const text = {
  title: 'Loading Accounts',
  desc: 'We’re loading accounts from your\nledger device. This will take a few\nseconds...',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  min-height: calc(100vh - 48px);
  height: auto;
  padding: 24px 20px;
  margin: 0 auto;

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

export const ConnectRequestWalletLoad = () => {

  return (
    <Wrapper>
      <img className='icon' src={IconConnectRequestPermissionLoading} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        disabled
      >
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
