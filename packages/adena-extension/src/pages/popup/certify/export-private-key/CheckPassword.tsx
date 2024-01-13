import React, { useState } from 'react';
import styled from 'styled-components';

import { DefaultInput, ErrorText } from '@components/atoms';
import { TermsCheckbox, CancelAndConfirmButton } from '@components/molecules';
import { useAdenaContext } from '@hooks/use-context';
import { validateInvalidPassword } from '@common/validation';
import { BaseError } from '@common/errors';
import useAppNavigate from '@hooks/use-app-navigate';

const StyledTermsWrap = styled.div`
  margin-top: auto;
  .terms-A {
    margin-bottom: 13px;
  }
`;

const TermsAText = 'Anyone with my private key will have full control over my funds.';
const TermsBText = 'I will never share my private key with anyone.';

const CheckPassword = ({
  setIsValidPwd,
}: {
  setIsValidPwd: (isValidPwd: boolean) => void;
}): JSX.Element => {
  const { goBack } = useAppNavigate();
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
      setIsValidPwd(true);
    } catch (e) {
      if (e instanceof BaseError) {
        setError(true);
        setErrorMessage('Invalid password');
      }
    }
  };

  return (
    <>
      <DefaultInput
        type='password'
        placeholder='Password'
        value={pwd}
        onChange={onChange}
        onKeyDown={onKeyDown}
        error={error}
      />
      {Boolean(errorMessage) && <ErrorText text={errorMessage} />}
      <StyledTermsWrap>
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
          cancelButtonProps={{ onClick: goBack }}
          confirmButtonProps={{
            onClick: confirmButtonClick,
            text: 'Next',
            props: { disabled: !disabled },
          }}
        />
      </StyledTermsWrap>
    </>
  );
};

export default CheckPassword;
