import Button, { ButtonHierarchy } from '@components/buttons/button';
import DefaultInput from '@components/default-input';
import Text from '@components/text';
import { Title } from '@pages/certify/login';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { RoutePath } from '@router/path';
import { useLocation, useNavigate } from 'react-router-dom';
import { InjectionMessageInstance } from '@inject/message';
import LoadingApproveTransaction from '@components/loading-screen/loading-approve-transaction';
import { decodeParameter, parseParmeters } from '@common/utils/client-utils';
import { MessageKeyType } from '@inject/message';
import { PasswordValidationError } from '@common/errors';
import { ErrorText } from '@components/error-text';
import { validateEmptyPassword, validateWrongPasswordLength } from '@common/validation';
import { useAdenaContext } from '@hooks/use-context';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useLoadAccounts } from '@hooks/use-load-accounts';

const text = 'Enter\nYour Password';
const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  max-width: 380px;
  min-height: 514px;
  padding: 29px 20px 24px;
`;

export const ApproveLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletService } = useAdenaContext();
  const [, setState] = useRecoilState(WalletState.state);
  const { state, loadAccounts } = useLoadAccounts();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<PasswordValidationError | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [requestData, setRequestData] = useState<{ [key in string]: any } | undefined>(undefined);

  useEffect(() => {
    const data = parseParmeters(location.search);
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
    inputRef.current?.focus();
  }, [inputRef]);

  useEffect(() => {
    setError(null);
  }, [password]);

  const tryLoginApprove = async (password: string) => {
    let currentError = null;
    try {
      validateEmptyPassword(password);
      validateWrongPasswordLength(password);
      const equalPassword = await walletService.equalsPassowrd(password);
      if (equalPassword) {
        await walletService.updatePassowrd(password);
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

  const redirect = () => {
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
      default:
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure('UNEXPECTED_ERROR', requestData),
        );
        break;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') tryLoginApprove(password);
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    [password],
  );

  const approveButtonClick = () => tryLoginApprove(password);

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
          <Button
            fullWidth
            hierarchy={ButtonHierarchy.Primary}
            onClick={approveButtonClick}
            margin='auto 0px 0px'
          >
            <Text type='body1Bold'>Unlock</Text>
          </Button>
        </Wrapper>
      ) : (
        <LoadingApproveTransaction rightButtonText='Login' />
      )}
    </>
  );
};
