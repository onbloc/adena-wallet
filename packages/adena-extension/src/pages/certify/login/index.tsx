import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import theme from '@styles/theme';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import DefaultInput from '@components/default-input';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { validateWrongPasswordLength } from '@common/validation';
import { useAdenaContext } from '@hooks/use-context';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { usePreventHistoryBack } from '@hooks/use-prevent-history-back';

const text = 'Enter\nYour Password';

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')}
  width: 100%;
  height: 100%;
`;

export const Title = styled.p`
  ${({ theme }) => theme.fonts.header4};
  margin: 54px 0px 56px;
  white-space: pre-wrap;
  width: 100%;
`;

export const ForgetPwd = styled.button`
  display: inline-block;
  margin-top: 32px;
`;

export const Login = () => {
  usePreventHistoryBack();
  const navigate = useNavigate();
  const { walletService } = useAdenaContext();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [validateState, setValidateState] = useState(true);
  const { loadAccounts } = useLoadAccounts();
  const [existWallet, setExistWallet] = useState(false);

  useEffect(() => {
    walletService.existsWallet().then(existWallet => {
      if (!existWallet) {
        navigate(RoutePath.Home);
      }
      setExistWallet(existWallet);
    }).catch(() => navigate(RoutePath.Home));
  }, []);

  useEffect(() => {
    focusInput();
  }, [existWallet]);

  useEffect(() => {
    setValidateState(true);
  }, [password]);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const login = async () => {
    try {
      if (validateWrongPasswordLength(password)) {
        const result = await walletService.equalsPassowrd(password);
        if (!result) {
          setValidateState(false);
          return;
        }
        await walletService.updatePassowrd(password);
        await loadAccounts();
        navigate(RoutePath.Wallet);
        return;
      }
    } catch (e) {
      setValidateState(false);
      console.log(e);
    }
  };

  const onChangePasswordInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    },
    [password],
  );

  const onClickUnLockButton = () => login();

  const onKeyEventUnLockButton = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && location.pathname === '/login') {
      login();
    }
  };

  const onClickForgotButton = () => navigate(RoutePath.ForgotPassword);

  return existWallet ? (
    <Wrapper>
      <Title>{text}</Title>
      <DefaultInput
        type='password'
        placeholder='Password'
        onChange={onChangePasswordInput}
        onKeyDown={onKeyEventUnLockButton}
        error={!validateState}
        ref={inputRef}
      />
      <ForgetPwd onClick={onClickForgotButton}>
        <Text type='body2Reg' color={theme.color.neutral[9]}>
          Forgot Password?
        </Text>
      </ForgetPwd>
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        onClick={onClickUnLockButton}
        margin='auto 0px 0px'
      >
        <Text type='body1Bold'>Unlock</Text>
      </Button>
    </Wrapper>
  ) : <div></div>;
};
