import React, { useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import TermsCheckbox from '@ui/common/TermsCheckbox';
import TitleWithDesc from '@ui/common/TitleWithDesc';
import FullButton from '@ui/common/Button/FullButton';
import Typography from '@ui/common/Typography';
import { ErrorText } from '@ui/common/ErrorText';
import { useCreatePassword } from './useCreatePassword';
import DefaultInput from '@ui/common/DefaultInput';
import { useLocation } from 'react-router-dom';

const text = {
  title: 'Create a\npassword',
  desc: 'This will be used to unlock your wallet.',
};

const Wrapper = styled.section`
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

type LocationSeeds = {
  seeds: string;
};

export const CreatePasswordView = () => {
  const { pwdState, confirmPwdState, termsState, errorMessage, buttonState, setSeeds, onKeyDown } =
    useCreatePassword();
  const location = useLocation();
  const handleLinkClick = () => window.open('https://adena.app/terms', '_blank');

  useEffect(() => {
    const state = location.state as LocationSeeds;
    setSeeds(state.seeds);
    if (!buttonState.disabled === false) {
      //navigate(RoutePath.LaunchAdena);
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
          value={pwdState.value}
          onChange={pwdState.onChange}
          onKeyDown={onKeyDown}
          error={pwdState.error}
          ref={pwdState.ref}
        />
        <DefaultInput
          type='password'
          name='confirmPwd'
          placeholder='Confirm Password'
          value={confirmPwdState.value}
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
        children={
          <button className='terms-button' type='button' onClick={handleLinkClick} tabIndex={4}>
            Terms of Use.
          </button>
        }
      />
      <FullButton
        mode='primary'
        disabled={buttonState.disabled}
        onClick={buttonState.onClick}
        tabIndex={5}
      >
        <Typography type='body1Bold' disabled={buttonState.disabled}>
          Save
        </Typography>
      </FullButton>
    </Wrapper>
  );
};
