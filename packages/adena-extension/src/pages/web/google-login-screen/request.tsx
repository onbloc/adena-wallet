import React, { useCallback, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebButton, WebImg, WebText } from '@components/atoms';

import AnimationWaitForGoogleLogin from '@assets/web/waiting-for-google-login.gif';

const StyledContainer = styled(View)`
  row-gap: 24px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
  margin-top: 16px;
`;

interface GoogleLoginRequestProps {
  requestGoogleLogin: () => Promise<void>;
  backStep: () => void;
}

const GoogleLoginRequest: React.FC<GoogleLoginRequestProps> = ({
  requestGoogleLogin,
  backStep,
}) => {
  const theme = useTheme();

  const onClickCancel = useCallback(() => {
    backStep();
  }, [backStep]);

  useEffect(() => {
    requestGoogleLogin();
  }, []);

  return (
    <StyledContainer>
      <WebImg src={AnimationWaitForGoogleLogin} height={120} />
      <StyledMessageBox>
        <WebText
          type='headline2'
          textCenter
        >
          Waiting for Google Login
        </WebText>
        <WebText
          type='body4'
          color={theme.webNeutral._500}
          textCenter
        >
          {
            'Complete your login by signing in with a Google\naccount in your browser. '
          }
        </WebText>
      </StyledMessageBox>
      <WebButton
        figure='tertiary'
        size='small'
        onClick={onClickCancel}
        text='Cancel'
      />
    </StyledContainer>
  );
};

export default GoogleLoginRequest;
