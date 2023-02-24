import React from 'react';
import styled from 'styled-components';
import { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import Icon from '@components/icons';

const text = {
  title: 'Login Failed',
  desc: 'As your seed phrase and private keys\nare only stored on your device, Adena\ncannot recover them for you. You must\nreset your wallet to continue.',
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
  const cancelHandler = () => {};

  const retryHandler = () => {};

  return (
    <Wrapper>
      <Icon name='iconConnectFailed' />
      <TitleWithDesc title={text.title} desc={text.desc} className='google-login-failed' />
      <CancelAndConfirmButton
        cancelButtonProps={{
          onClick: cancelHandler,
        }}
        confirmButtonProps={{
          onClick: retryHandler,
          hierarchy: ButtonHierarchy.Primary,
          text: 'Retry',
        }}
      />
    </Wrapper>
  );
};
