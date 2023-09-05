import React from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import { ErrorText } from '@components/error-text';
import DefaultInput from '@components/default-input';
import { useChangePassword } from './use-change-password';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

const FormBox = styled.div`
  margin-top: 12px;
  margin-bottom: auto;
  input + input {
    margin-top: 12px;
  }
`;

export const ChangePassword = () => {
  const { currPwdState, newPwdState, confirmPwdState, errorMessage, buttonState, onKeyDown } =
    useChangePassword();

  return (
    <Wrapper>
      <Text type='header4'>Change Password</Text>
      <FormBox>
        <DefaultInput
          type='password'
          name='currPwd'
          placeholder='Current Password'
          onChange={currPwdState.onChange}
          onKeyDown={onKeyDown}
          error={currPwdState.error}
          ref={currPwdState.ref}
        />
        <DefaultInput
          type='password'
          name='newPwd'
          placeholder='New Password'
          onChange={newPwdState.onChange}
          onKeyDown={onKeyDown}
          error={newPwdState.error}
        />
        <DefaultInput
          type='password'
          name='confirmPwd'
          placeholder='Confirm New Password'
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
