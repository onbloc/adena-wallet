import theme from '@styles/theme';
import FullButton from '@ui/common/Button/FullButton';
import DefaultInput from '@ui/common/DefaultInput';
import Typography from '@ui/common/Typography';
import { Title, ForgetPwd } from '@ui/domains/Login/LoginView';
import { useLogin } from '@ui/domains/Login/useLogin';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useSdk } from '@services/client';
import { RoutePath } from '@router/path';

const text = 'Enter\nYour Password';

import { walletDeserialize, getSavedPassword } from '@services/client/fetcher';
import { useNavigate } from 'react-router-dom';

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .logo {
    margin: 24px auto;
  }
`;

export const ApproveTransactionLogin = () => {
  const { passwordState, approveButtonClick } = useLogin();
  const sdk = useSdk();
  const navigate = useNavigate();

  const autoLogin = () => {
    getSavedPassword().then((pwd: string) => {
      walletDeserialize(pwd).then((wallet) => navigate(RoutePath.ApproveTransaction));
    });
  };

  useEffect(() => {
    autoLogin();
  }, []);

  return (
    <Wrapper>
      <Title>{text}</Title>
      <DefaultInput
        type='password'
        placeholder='Password'
        value={passwordState.value}
        onChange={passwordState.onChange}
        onKeyDown={passwordState.onKeyDown}
        error={passwordState.error}
        ref={passwordState.ref}
      />
      <FullButton mode='primary' onClick={approveButtonClick} margin='auto 0px 0px'>
        <Typography type='body1Bold'>Unlock</Typography>
      </FullButton>
    </Wrapper>
  );
};
