import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import Icon from '@components/icons';

const text = {
  title: 'Login Failed',
  desc: 'Your sign-in attempt was unsuccessful.\nPlease try again with a valid Google account.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
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

export const GoogleConnectFailed = () => {
  const retryHandler = () => {};

  return (
    <Wrapper>
      <Icon name='iconConnectFailed' />
      <TitleWithDesc title={text.title} desc={text.desc} className='google-login-failed' />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        onClick={retryHandler}
        margin='auto 0px 0px'
      >
        <Text type='body1Bold'>Retry</Text>
      </Button>
    </Wrapper>
  );
};
