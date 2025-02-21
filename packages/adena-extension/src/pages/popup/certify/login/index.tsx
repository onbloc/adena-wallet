import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

import { validateEmptyPassword } from '@common/validation';
import { Button, DefaultInput, Text } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { usePreventHistoryBack } from '@hooks/use-prevent-history-back';
import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';
import { RoutePath } from '@types';

const text = 'Enter\nYour Password';

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'stretch' })}
  width: 100%;
  height: 100%;
`;

export const Title = styled.p`
  ${fonts.header4};
  margin: 54px 0px 56px;
  white-space: pre-wrap;
  width: 100%;
`;

export const ForgetPwd = styled.button`
  display: inline-block;
  margin-top: 32px;
`;

export const Login = (): JSX.Element => {
  usePreventHistoryBack();

  const theme = useTheme();
  const { navigate } = useAppNavigate();
  const { walletService } = useAdenaContext();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [validateState, setValidateState] = useState(true);
  const { loadAccounts } = useLoadAccounts();
  const [existWallet, setExistWallet] = useState(false);

  useEffect(() => {
    walletService
      .existsWallet()
      .then((existWallet) => {
        if (!existWallet) {
          navigate(RoutePath.Home);
        }
        setExistWallet(existWallet);
      })
      .catch(() => navigate(RoutePath.Home));
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

  const login = async (): Promise<void> => {
    try {
      if (validateEmptyPassword(password)) {
        const result = await walletService.equalsPassword(password);
        if (!result) {
          setValidateState(false);
          return;
        }
        await walletService.updatePassword(password);
        await setPassword('');
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

  const onClickUnLockButton = (): Promise<void> => login();

  const onKeyEventUnLockButton = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && location.pathname === '/login') {
      login();
    }
  };

  const onClickForgotButton = (): void => navigate(RoutePath.ForgotPassword);

  return existWallet ? (
    <Wrapper>
      <Title>{text}</Title>
      <DefaultInput
        value={password}
        type='password'
        placeholder='Password'
        onChange={onChangePasswordInput}
        onKeyDown={onKeyEventUnLockButton}
        error={!validateState}
        ref={inputRef}
      />
      <ForgetPwd onClick={onClickForgotButton}>
        <Text type='body2Reg' color={theme.neutral.a}>
          Forgot Password?
        </Text>
      </ForgetPwd>
      <Button fullWidth onClick={onClickUnLockButton} margin='auto 0px 0px'>
        <Text type='body1Bold'>Unlock</Text>
      </Button>
    </Wrapper>
  ) : (
    <React.Fragment />
  );
};
