import React, { useCallback } from 'react';
import styled from 'styled-components';

import { View, WebButton } from '@components/atoms';

import AnimationLoginFailed from '@assets/web/lottie/login-failed.json';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

interface GoogleLoginRequestFailProps {
  retry: () => void;
}

const GoogleLoginRequestFail: React.FC<GoogleLoginRequestFailProps> = ({ retry }) => {
  const onClickRetry = useCallback(() => {
    retry();
  }, [retry]);

  return (
    <StyledContainer>
      <View style={{ marginBottom: 16 }}>
        <Lottie
          animationData={AnimationLoginFailed}
          height={120}
        />
      </View>
      <WebTitleWithDescription
        title='Login Failed'
        description={
          'Your sign-in attempt was unsuccessful. Please try\nagain with a valid Google account. '
        }
        isCenter
        marginBottom={-6}
      />
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
