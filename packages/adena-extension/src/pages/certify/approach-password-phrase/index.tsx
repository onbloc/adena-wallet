import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import DefaultInput from '@components/default-input';
import WarningBox from '@components/warning/warning-box';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { CSSProp } from 'styled-components';
import Text from '@components/text';
import TermsCheckbox from '@components/terms-checkbox';
import { RoutePath } from '@router/path';
import { useAdenaContext } from '@hooks/use-context';
import { validateInvalidPassword } from '@common/validation';
import { BaseError } from '@common/errors';
import { ErrorText } from '@components/error-text';

const TermsAText = 'Anyone with my private key will have full control over my funds.';
const TermsBText = 'I will never share my private key with anyone.';

export const ApproachPasswordPhrase = (): JSX.Element => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const backButtonClick = (): void => navigate(-1);
  const { walletService } = useAdenaContext();
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [termsA, setTermsA] = useState(false);
  const [termsB, setTermsB] = useState(false);
  const disabled = termsA && termsB && pwd;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPwd(e.target.value);
    setError(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && termsA && termsB && pwd) {
      confirmButtonClick();
    }
  };

  const termsAChange = (): void => {
    setTermsA((prev: boolean) => !prev);
  };

  const termsBChange = (): void => {
    setTermsB((prev: boolean) => !prev);
  };

  const confirmButtonClick = async (): Promise<void> => {
    try {
      const storedPassword = await walletService.loadWalletPassword();
      validateInvalidPassword(pwd, storedPassword);
      navigate(RoutePath.ApproachPrivatePhrase, { state });
    } catch (e) {
      if (e instanceof BaseError) {
        setError(true);
        setErrorMessage('Invalid pasword');
      }
    }
  };

  return (
    <Wrapper>
      <Text type='header4'>Export Private Key</Text>
      <WarningBox type='approachPassword' margin='12px 0px 20px' />
      <DefaultInput
        type='password'
        placeholder='Password'
        value={pwd}
        onChange={onChange}
        onKeyDown={onKeyDown}
        error={error}
      />
      {Boolean(errorMessage) && <ErrorText text={errorMessage} />}
      <TermsWrap>
        <TermsCheckbox
          checked={termsA}
          onChange={termsAChange}
          tabIndex={2}
          id='terms-A'
          text={TermsAText}
          checkboxPos='TOP'
          className='terms-A'
        />
        <TermsCheckbox
          checked={termsB}
          onChange={termsBChange}
          tabIndex={3}
          id='terms-B'
          text={TermsBText}
          checkboxPos='TOP'
        />
        <CancelAndConfirmButton
          cancelButtonProps={{ onClick: backButtonClick }}
          confirmButtonProps={{
            onClick: confirmButtonClick,
            text: 'Next',
            props: { disabled: !disabled },
          }}
        />
      </TermsWrap>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
`;

const TermsWrap = styled.div`
  margin-top: auto;
  .terms-A {
    margin-bottom: 13px;
  }
`;
