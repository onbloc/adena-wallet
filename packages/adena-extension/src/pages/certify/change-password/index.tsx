import React from 'react';
import styled from 'styled-components';

import { Text, DefaultInput, ErrorText } from '@components/atoms';
import { CancelAndConfirmButton } from '@components/molecules';

import { useChangePassword } from '@hooks/certify/use-change-password';
import mixins from '@styles/mixins';

const Wrapper = styled.main`
  ${mixins.flex('column', 'flex-start', 'flex-start')};
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

export const ChangePassword = (): JSX.Element => {
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
