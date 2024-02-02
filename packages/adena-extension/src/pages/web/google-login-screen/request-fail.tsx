import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebButton, WebImg, WebText } from '@components/atoms';

import AnimationLoginFailed from '@assets/web/login-failed.gif';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
  margin-top: 16px;
`;

interface GoogleLoginRequestFailProps {
  retry: () => void;
}

const GoogleLoginRequestFail: React.FC<GoogleLoginRequestFailProps> = ({
  retry,
}) => {
  const theme = useTheme();

  const onClickRetry = useCallback(() => {
    retry();
  }, [retry]);

  return (
    <StyledContainer>
      <WebImg src={AnimationLoginFailed} height={120} />
      <StyledMessageBox>
        <WebText
          type='headline2'
          textCenter
        >
          Login Failed
        </WebText>
        <WebText
          type='body4'
          color={theme.webNeutral._500}
          textCenter
        >
          {
            'Your sign-in attempt was unsuccessful. Please try\nagain with a valid Google account. '
          }
        </WebText>
      </StyledMessageBox>
      <WebButton
        figure='primary'
        size='small'
        text='Retry'
        rightIcon='chevronRight'
        onClick={onClickRetry}
      />
    </StyledContainer>
  );
};

export default GoogleLoginRequestFail;
