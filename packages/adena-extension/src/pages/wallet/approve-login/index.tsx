import Button, { ButtonHierarchy } from '@components/buttons/button';
import DefaultInput from '@components/default-input';
import Text from '@components/text';
import { Title } from '@pages/certify/login';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { RoutePath } from '@router/path';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWalletLoader } from '@hooks/use-wallet-loader';
import { InjectionMessageInstance } from '@inject/message';
import LoadingApproveTransaction from '@components/loading-screen/loading-approve-transaction';
import { decodeParameter, parseParmeters } from '@common/utils/client-utils';
import { ValidationService } from '@services/index';
import { MessageKeyType } from '@inject/message'
import { PasswordValidationError } from '@common/errors';
import { ErrorText } from '@components/error-text';

const text = 'Enter\nYour Password';
const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  position: fixed;
  top: 48px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  padding: 0px 20px 24px;
`;

export const ApproveLogin = () => {
  const navigate = useNavigate();
  const [state, loadWallet, loadWalletByPassword] = useWalletLoader();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<PasswordValidationError | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [requestData, setRequestData] = useState<{ [key in string]: any } | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    const data = parseParmeters(location.search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });
  }, []);

  useEffect(() => {
    switch (state) {
      case 'NONE':
        loadWallet();
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
      ValidationService.validateEmptyPassword(password);
      ValidationService.validateWrongPasswordLength(password);
      await loadWalletByPassword(password);
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
      default:
        chrome.runtime.sendMessage(InjectionMessageInstance.failure('UNEXPECTED_ERROR', requestData));
        break;
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') tryLoginApprove(password);
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    [password],
  );

  const approveButtonClick = () => tryLoginApprove(password);

  return (
    <Wrapper>
      {state === 'LOGIN' || (state === 'LOADING' && password !== '') ? (
        <>
          <Title>
            {text}
          </Title>
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
        </>
      ) : (
        <LoadingApproveTransaction />
      )}
    </Wrapper>
  );
};
