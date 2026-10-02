import React, { useCallback } from 'react';
import styled from 'styled-components';

import { View, WebButton, WebInput } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  padding-top: 16px;
`;

const StyledInputBox = styled(View)`
  row-gap: 12px;
  width: 100%;
`;

const StyledButtonBox = styled(View)`
  align-items: flex-start;
`;

interface EmailLoginEnterEmailProps {
  email: string;
  ableToConfirmEmail: boolean;
  changeEmail: (email: string) => void;
  confirmEmail: () => void;
}

const EmailLoginEnterEmail: React.FC<EmailLoginEnterEmailProps> = ({
  email,
  ableToConfirmEmail,
  changeEmail,
  confirmEmail,
}) => {
  const onChangeEmailInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      changeEmail(event.target.value);
    },
    [changeEmail],
  );

  const onKeyDownEmailInput = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        confirmEmail();
      }
    },
    [confirmEmail],
  );

  return (
    <StyledContainer>
      <WebTitleWithDescription
        title='Enter your Email Address'
        description='This will be used to access your wallet.'
        marginBottom={-6}
      />

      <StyledInputBox>
        <WebInput
          type='email'
          name='email'
          value={email}
          placeholder='Email Address'
          autoComplete='off'
          onChange={onChangeEmailInput}
          onKeyDown={onKeyDownEmailInput}
        />
      </StyledInputBox>

      <StyledButtonBox>
        <WebButton
          figure='primary'
          size='small'
          onClick={confirmEmail}
          disabled={!ableToConfirmEmail}
          text='Next'
          rightIcon='chevronRight'
        />
      </StyledButtonBox>
    </StyledContainer>
  );
};

export default EmailLoginEnterEmail;
