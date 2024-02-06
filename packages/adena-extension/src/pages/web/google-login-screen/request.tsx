import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';

import { View, WebButton, WebImg } from '@components/atoms';

import AnimationWaitForGoogleLogin from '@assets/web/waiting-for-google-login.gif';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

interface GoogleLoginRequestProps {
  requestGoogleLogin: () => Promise<void>;
  backStep: () => void;
}

const GoogleLoginRequest: React.FC<GoogleLoginRequestProps> = ({
  requestGoogleLogin,
  backStep,
}) => {
  const onClickCancel = useCallback(() => {
    backStep();
  }, [backStep]);

  useEffect(() => {
    requestGoogleLogin();
  }, []);

  return (
    <StyledContainer>
      <View style={{ marginBottom: 16 }}>
        <WebImg src={AnimationWaitForGoogleLogin} height={120} />
      </View>
      <WebTitleWithDescription
        title='Waiting for Google Login'
        description={'Complete your login by signing in with a Google\naccount in your browser. '}
        isCenter
        marginBottom={-6}
      />

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
