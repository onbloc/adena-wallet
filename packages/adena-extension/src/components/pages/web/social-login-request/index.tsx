import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';

import { View, WebButton } from '@components/atoms';
import Lottie from '@components/atoms/lottie';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

export interface SocialLoginRequestProps {
  title: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animationData: any;
  requestLogin: () => Promise<void>;
  cancelLogin: () => void;
}

// The login happens in a popup, so this screen only starts the request and
// offers a way out of it.
const SocialLoginRequest: React.FC<SocialLoginRequestProps> = ({
  title,
  description,
  animationData,
  requestLogin,
  cancelLogin,
}) => {
  const onClickCancel = useCallback(() => {
    cancelLogin();
  }, [cancelLogin]);

  useEffect(() => {
    requestLogin();
  }, []);

  return (
    <StyledContainer>
      <View style={{ marginBottom: 16 }}>
        <Lottie speed={1} height={120} animationData={animationData} />
      </View>
      <WebTitleWithDescription title={title} description={description} isCenter marginBottom={-6} />

      <WebButton figure='tertiary' size='small' onClick={onClickCancel} text='Cancel' />
    </StyledContainer>
  );
};

export default SocialLoginRequest;
