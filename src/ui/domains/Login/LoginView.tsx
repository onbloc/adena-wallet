import React from 'react';
import styled from 'styled-components';
// import { useLogin, getSavedPassword } from "./useLogin";
import { useLogin } from './useLogin';
import Typography, { textVariants } from '@ui/common/Typography';
import theme from '@styles/theme';
import FullButton from '@ui/common/Button/FullButton';
import DefaultInput from '@ui/common/DefaultInput';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';

const text = 'Enter\nYour Password';

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')}
  width: 100%;
  height: 100%;
`;

export const Title = styled.p`
  ${textVariants.header4};
  margin: 54px 0px 56px;
  white-space: pre-wrap;
  width: 100%;
`;

export const ForgetPwd = styled.button`
  display: inline-block;
  margin-top: 32px;
`;

export const LoginView = () => {
  const { passwordState, unlockButtonClick, forgotButtonClick } = useLogin();

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
      <ForgetPwd onClick={forgotButtonClick}>
        <Typography type='body2Reg' color={theme.color.neutral[2]}>
          Forgot Password?
        </Typography>
      </ForgetPwd>
      <FullButton mode='primary' onClick={unlockButtonClick} margin='auto 0px 0px'>
        <Typography type='body1Bold'>Unlock</Typography>
      </FullButton>
    </Wrapper>
  );
};
