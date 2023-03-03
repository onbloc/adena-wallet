import React from 'react';
import styled from 'styled-components';
import TermsCheckbox from '@components/terms-checkbox';
import TitleWithDesc from '@components/title-with-desc';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Text from '@components/text';
import { ErrorText } from '@components/error-text';
import DefaultInput from '@components/default-input';
import { useLedgerPassword } from './use-ledger-password';

const text = {
  title: 'Create\na Password',
  desc: 'This will be used to unlock your wallet.',
};


export const ApproveHardwareWalletLedgerPassword = () => {
  const { pwdState, confirmPwdState, termsState, errorMessage, buttonState, onKeyDown } =
    useLedgerPassword();
  const handleLinkClick = () => window.open('https://adena.app/terms', '_blank');

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <FormBox>
        <DefaultInput
          type='password'
          name='pwd'
          placeholder='Password'
          onChange={pwdState.onChange}
          onKeyDown={onKeyDown}
          error={pwdState.error}
          ref={pwdState.ref}
        />
        <DefaultInput
          type='password'
          name='confirmPwd'
          placeholder='Confirm Password'
          onChange={confirmPwdState.onChange}
          onKeyDown={onKeyDown}
          error={confirmPwdState.error}
        />
        {errorMessage && <ErrorText text={errorMessage} />}
      </FormBox>
      <TermsCheckbox
        checked={termsState.value}
        onChange={termsState.onChange}
        text='I agree to the&nbsp;'
        tabIndex={3}
      >
        <button className='terms-button' type='button' onClick={handleLinkClick} tabIndex={4}>
          Terms of Use.
        </button>
      </TermsCheckbox>
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        disabled={buttonState.disabled}
        onClick={buttonState.onClick}
        tabIndex={5}
      >
        <Text type='body1Bold'>Save</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  max-width: 380px;
  padding-top: 50px;
`;

const FormBox = styled.div`
  margin-top: 20px;
  input + input {
    margin-top: 12px;
  }
`;
