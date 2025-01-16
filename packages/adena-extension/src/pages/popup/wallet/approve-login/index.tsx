import { WalletResponseFailureType, WalletResponseType } from '@adena-wallet/sdk';
import { isAirgapAccount } from 'adena-module';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import styled, { useTheme } from 'styled-components';

import { PasswordValidationError } from '@common/errors';
import { decodeParameter, parseParameters } from '@common/utils/client-utils';
import { validateEmptyPassword } from '@common/validation';
import { Button, DefaultInput, Text } from '@components/atoms';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { InjectionMessageInstance } from '@inject/message';
import { ForgetPwd, Title } from '@pages/popup/certify/login';
import { WalletState } from '@states';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';

import LoadingApproveTransaction from './loading-approve-transaction';

const text = 'Enter\nYour Password';
const Wrapper = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  max-width: 100%;
  min-height: 100%;
  padding: 29px 20px 72px;
`;

export const ApproveLogin = (): JSX.Element => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { walletService } = useAdenaContext();
  const { initWallet } = useWalletContext();
  const [, setState] = useRecoilState(WalletState.state);
  const { state, loadAccounts } = useLoadAccounts();
  const { currentAccount } = useCurrentAccount();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<PasswordValidationError | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [requestData, setRequestData] = useState<{ [key in string]: any } | undefined>(undefined);

  useEffect(() => {
    const data = parseParameters(location.search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });
  }, []);

  useEffect(() => {
    switch (state) {
      case 'NONE':
        loadAccounts();
        break;
      case 'FINISH':
        redirect();
        break;
      case 'CREATE':
      case 'FAIL':
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, requestData),
        );
        break;
      default:
        break;
    }
  }, [state]);

  useEffect(() => {
    focusInput();
  }, [state]);

  useEffect(() => {
    setError(null);
  }, [password]);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const tryLoginApprove = async (password: string): Promise<void> => {
    let currentError = null;
    try {
      validateEmptyPassword(password);
      const equalPassword = await walletService.equalsPassword(password);
      if (equalPassword) {
        await walletService.updatePassword(password);
        await initWallet();
        setState('FINISH');
      }
    } catch (error) {
      if (error instanceof PasswordValidationError) {
        currentError = new PasswordValidationError('INVALID_PASSWORD');
      }
    }
    if (currentError === null) {
      currentError = new PasswordValidationError('INVALID_PASSWORD');
    }
    setError(currentError);
  };

  const redirect = (): void => {
    switch (requestData?.type as WalletResponseType | undefined) {
      case 'DO_CONTRACT':
        if (currentAccount === null || isAirgapAccount(currentAccount)) {
          navigate(RoutePath.ApproveSignFailed);
          return;
        }
        navigate(RoutePath.ApproveTransaction + location.search, { state: { requestData } });
        return;
      case 'SIGN_AMINO':
        if (currentAccount === null || isAirgapAccount(currentAccount)) {
          navigate(RoutePath.ApproveSignFailed);
          return;
        }
        navigate(RoutePath.ApproveSign + location.search, { state: { requestData } });
        return;
      case 'SIGN_TX':
        if (currentAccount === null || isAirgapAccount(currentAccount)) {
          navigate(RoutePath.ApproveSignFailed);
          return;
        }
        navigate(RoutePath.ApproveSignTransaction + location.search, { state: { requestData } });
        return;
      case 'ADD_ESTABLISH':
        navigate(RoutePath.ApproveEstablish + location.search, { state: { requestData } });
        return;
      case 'ADD_NETWORK':
        navigate(RoutePath.ApproveAddingNetwork + location.search, { state: { requestData } });
        return;
      case 'SWITCH_NETWORK':
        navigate(RoutePath.ApproveChangingNetwork + location.search, { state: { requestData } });
        return;
      default:
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(WalletResponseFailureType.UNEXPECTED_ERROR, requestData),
        );
        return;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') tryLoginApprove(password);
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    [password],
  );

  const approveButtonClick = (): Promise<void> => tryLoginApprove(password);

  const onClickForgotButton = (): void => navigate(RoutePath.ForgotPassword);

  return (
    <>
      {state === 'LOGIN' || (state === 'LOADING' && password !== '') ? (
        <Wrapper>
          <Title>{text}</Title>
          <DefaultInput
            type='password'
            placeholder='Password'
            onChange={onChange}
            onKeyDown={onKeyDown}
            error={error !== null}
            ref={inputRef}
          />
          <ForgetPwd onClick={onClickForgotButton}>
            <Text type='body2Reg' color={theme.neutral.a}>
              Forgot Password?
            </Text>
          </ForgetPwd>
          <Button fullWidth onClick={approveButtonClick} margin='auto 0px 0px'>
            <Text type='body1Bold'>Unlock</Text>
          </Button>
        </Wrapper>
      ) : (
        <LoadingApproveTransaction rightButtonText='Approve' />
      )}
    </>
  );
};
