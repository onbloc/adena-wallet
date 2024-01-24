import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-rounded.svg';
import { View, WebButton, WebImg, WebText } from '@components/atoms';

const StyledContainer = styled(View)`
  row-gap: 24px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

interface GoogleLoginInitStepProps {
  initGoogleLogin: () => void;
}

const GoogleLoginInitStep: React.FC<GoogleLoginInitStepProps> = ({
  initGoogleLogin,
}) => {
  const theme = useTheme();

  const onClickNext = useCallback(() => {
    initGoogleLogin();
  }, [initGoogleLogin]);

  return (
    <StyledContainer>
      <WebImg src={IconAlert} />
      <StyledMessageBox>
        <WebText type='headline3'>Sensitive Information Ahead</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          {
            'You are about to construct a private key on your device using Web3Auth,\na third party service provider. This account will be accessible with your\nsocial logins.'
          }
        </WebText>
      </StyledMessageBox>
      <WebButton
        figure='primary'
        size='small'
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default GoogleLoginInitStep;
