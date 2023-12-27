import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { Text, DefaultInput, ErrorText, Button } from '@components/atoms';
import { Title } from '@pages/certify/login';
import { RoutePath } from '@router/path';
import { InjectionMessageInstance } from '@inject/message';
import { decodeParameter, parseParameters } from '@common/utils/client-utils';
import { MessageKeyType } from '@inject/message';
import { PasswordValidationError } from '@common/errors';
import { validateEmptyPassword, validateWrongPasswordLength } from '@common/validation';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { WalletState } from '@states';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import LoadingApproveTransaction from './loading-approve-transaction';
import mixins from '@styles/mixins';

const text = 'Enter\nYour Password';
const Wrapper = styled.div`
  ${mixins.flex('column', 'center', 'flex-start')};
  max-width: 380px;
  min-height: 514px;
  padding: 29px 20px 24px;
`;

export const ApproveLogin = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletService } = useAdenaContext();
  const { initWallet } = useWalletContext();
  const [, setState] = useRecoilState(WalletState.state);
  const { state, loadAccounts } = useLoadAccounts();
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
        chrome.runtime.sendMessage(InjectionMessageInstance.failure('NO_ACCOUNT', requestData));
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
      validateWrongPasswordLength(password);
      const equalPassword = await walletService.equalsPassword(password);
      if (equalPassword) {
        await walletService.updatePassword(password);
        await initWallet();
        setState('FINISH');
      }
    } catch (error) {
      if (error instanceof PasswordValidationError) {
        currentError = error;
      }
    }
    if (currentError === null) {
      currentError = new PasswordValidationError('INVALID_PASSWORD');
    }
    setError(currentError);
  };

  const redirect = (): void => {
    switch (requestData?.type as MessageKeyType | undefined) {
      case 'DO_CONTRACT':
        navigate(RoutePath.ApproveTransaction + location.search, { state: { requestData } });
        break;
      case 'ADD_ESTABLISH':
        navigate(RoutePath.ApproveEstablish + location.search, { state: { requestData } });
        break;
      case 'SIGN_AMINO':
        navigate(RoutePath.ApproveSign + location.search, { state: { requestData } });
        break;
      case 'ADD_NETWORK':
        navigate(RoutePath.ApproveAddingNetwork + location.search, { state: { requestData } });
        break;
      case 'SWITCH_NETWORK':
        navigate(RoutePath.ApproveChangingNetwork + location.search, { state: { requestData } });
        break;
      default:
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure('UNEXPECTED_ERROR', requestData),
        );
        break;
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
          {error && <ErrorText text={error.message} />}
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
