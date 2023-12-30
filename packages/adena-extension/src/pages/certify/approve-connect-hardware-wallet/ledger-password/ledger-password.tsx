import React from 'react';
import styled from 'styled-components';

import { Text, DefaultInput, ErrorText, Button } from '@components/atoms';
import { TitleWithDesc, TermsCheckbox } from '@components/molecules';

import { useLedgerPassword } from './use-ledger-password';
import mixins from '@styles/mixins';

const text = {
  title: 'Create\na Password',
  desc: 'This will be used to unlock your wallet.',
};

export const ApproveHardwareWalletLedgerPassword = (): JSX.Element => {
  const { pwdState, confirmPwdState, termsState, errorMessage, buttonState, onKeyDown } =
    useLedgerPassword();
  const handleLinkClick = (): Window | null => window.open('https://adena.app/terms', '_blank');

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
      <Button fullWidth disabled={buttonState.disabled} onClick={buttonState.onClick} tabIndex={5}>
        <Text type='body1Bold'>Save</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  max-width: 380px;
  padding-top: 50px;
`;

const FormBox = styled.div`
  margin-top: 20px;
  input + input {
    margin-top: 12px;
  }
`;
