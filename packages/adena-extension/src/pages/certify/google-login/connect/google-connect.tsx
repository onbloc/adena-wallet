import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import { RoutePath } from '@router/path';
import { useNavigate } from 'react-router-dom';
import Icon from '@components/icons';

const text = {
  title: 'Waiting for Google Login',
  desc: 'Please login with your Google account\nin your browser. This service is powered\nby Web3Auth.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  max-width: 380px;
  min-height: 514px;
  padding-top: 50px;

  .google-login-connect {
    margin-bottom: 24px;
  }

  div {
    text-align: center;
  }
`;

export const GoogleConnect = () => {
  const navigate = useNavigate();

  return (
    <Wrapper>
      <Icon name='iconConnectLoading' />
      <TitleWithDesc title={text.title} desc={text.desc} className='google-login-connect' />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
        margin='auto 0px 0px'
        onClick={() => navigate(RoutePath.GoogleConnectFailed)}
      >
        <Text type='body1Bold'>Cancel</Text>
      </Button>
    </Wrapper>
  );
};
