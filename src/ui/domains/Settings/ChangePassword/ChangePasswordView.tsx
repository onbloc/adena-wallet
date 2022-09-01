import React from 'react';
import styled from 'styled-components';
import Typography from '@ui/common/Typography';
import { ErrorText } from '@ui/common/ErrorText';
import DefaultInput from '@ui/common/DefaultInput';
import { useChangePassword } from './useChangePassword';
import CancelAndConfirmButton from '@ui/common/Button/CancelAndConfirmButton';

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

const FormBox = styled.div`
  margin-top: 24px;
  margin-bottom: auto;
  input + input {
    margin-top: 12px;
  }
`;

export const ChangePasswordView = () => {
  const { currPwdState, newPwdState, confirmPwdState, errorMessage, buttonState, onKeyDown } =
    useChangePassword();

  return (
    <Wrapper>
      <Typography type='header4'>Change Password</Typography>
      <FormBox>
        <DefaultInput
          type='password'
          name='currPwd'
          placeholder='Current Password'
          value={currPwdState.value}
          onChange={currPwdState.onChange}
          onKeyDown={onKeyDown}
          error={currPwdState.error}
          ref={currPwdState.ref}
        />
        <DefaultInput
          type='password'
          name='newPwd'
          placeholder='New Password'
          value={newPwdState.value}
          onChange={newPwdState.onChange}
          onKeyDown={onKeyDown}
          error={newPwdState.error}
        />
        <DefaultInput
          type='password'
          name='confirmPwd'
          placeholder='Confirm New Password'
          value={confirmPwdState.value}
          onChange={confirmPwdState.onChange}
          onKeyDown={onKeyDown}
          error={confirmPwdState.error}
        />
        {Boolean(errorMessage) && <ErrorText text={errorMessage} />}
      </FormBox>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: buttonState.onClick.cancel }}
        confirmButtonProps={{
          onClick: buttonState.onClick.save,
          text: 'Save',
          props: { disabled: buttonState.disabled },
        }}
      />
    </Wrapper>
  );
};
