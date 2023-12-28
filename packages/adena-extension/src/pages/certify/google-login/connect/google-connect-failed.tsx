import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

import { Text, Icon, Button } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import { RoutePath } from '@router/path';
import mixins from '@styles/mixins';

const text = {
  title: 'Login Failed',
  desc: 'Your sign-in attempt was unsuccessful.\nPlease try again with a valid Google account.',
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  max-width: 380px;
  min-height: 514px;
  padding-top: 50px;

  .google-login-failed {
    margin-top: 20px;
  }

  div {
    text-align: center;
  }
`;

export const GoogleConnectFailed = (): JSX.Element => {
  const navigate = useNavigate();

  const onClickRetry = (): void => {
    navigate(RoutePath.GoogleConnect);
  };

  return (
    <Wrapper>
      <Icon name='iconConnectFailed' />
      <TitleWithDesc title={text.title} desc={text.desc} className='google-login-failed' />
      <Button fullWidth onClick={onClickRetry} margin='auto 0px 0px'>
        <Text type='body1Bold'>Retry</Text>
      </Button>
    </Wrapper>
  );
};
