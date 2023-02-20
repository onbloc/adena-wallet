import React, { useEffect } from 'react';
import styled from 'styled-components';
import TermsCheckbox from '@components/terms-checkbox';
import TitleWithDesc from '@components/title-with-desc';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Text from '@components/text';
import { ErrorText } from '@components/error-text';
import DefaultInput from '@components/default-input';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCreatePassword } from '@pages/certify/create-password/use-create-password';
import { RoutePath } from '@router/path';

const text = {
  title: 'Create\na Password',
  desc: 'This will be used to unlock your wallet.',
};

type LocationSeeds = {
  seeds: string;
};

export const ApproveHardwareWalletLedgerPassword = () => {
  const { pwdState, confirmPwdState, termsState, errorMessage, buttonState, setSeeds, onKeyDown } =
    useCreatePassword();
  const navigate = useNavigate();
  const location = useLocation();
  const handleLinkClick = () => window.open('https://adena.app/terms', '_blank');

  useEffect(() => {
    const state = location.state as LocationSeeds;
    setSeeds(state.seeds);
    if (!buttonState.disabled === false) {
      navigate(RoutePath.ApproveHardwareWalletLedgerAllSet);
    }
  }, [buttonState]);

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
  width: 100%;
  height: 100%;
  padding-top: 50px;
`;

const FormBox = styled.div`
  margin-top: 20px;
  input + input {
    margin-top: 12px;
  }
`;
