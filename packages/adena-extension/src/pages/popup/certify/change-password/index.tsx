import styled from 'styled-components';

import { DefaultInput, ErrorText, Text } from '@components/atoms';
import { CancelAndConfirmButton } from '@components/molecules';

import { PasswordInput } from '@components/atoms/password-input';
import { useChangePassword } from '@hooks/certify/use-change-password';
import mixins from '@styles/mixins';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

const StyledFormWrapper = styled.div`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  margin-top: 12px;
`;

const FormBox = styled.div`
  width: 100%;
  margin-bottom: auto;

  & > * {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export const ChangePassword = (): JSX.Element => {
  const { currPwdState, newPwdState, confirmPwdState, errorMessage, buttonState, onKeyDown } =
    useChangePassword();

  return (
    <Wrapper>
      <Text type='header4'>Change Password</Text>
      <StyledFormWrapper>
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
          <PasswordInput
            type='password'
            name='newPwd'
            placeholder='New Password'
            value={newPwdState.value}
            onChange={newPwdState.onChange}
            onKeyDown={onKeyDown}
            error={newPwdState.error}
            evaluationResult={newPwdState.evaluationResult}
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
        </FormBox>
        {Boolean(errorMessage) && <ErrorText text={errorMessage} />}
      </StyledFormWrapper>
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
