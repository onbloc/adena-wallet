import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import AnimationLoginFailed from '@assets/web/lottie/login-failed.json';
import { View, WebButton } from '@components/atoms';
import Lottie from '@components/atoms/lottie';
import { WebTitleWithDescription } from '@components/molecules';
import { SocialLoginFailType } from '@hooks/web/social-login/use-social-login-account';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

export interface SocialLoginFailProps {
  /** Provider name used in the generic message, e.g. 'Google'. */
  providerName: string;
  failType: SocialLoginFailType;
  retry: () => void;
}

const SocialLoginFail: React.FC<SocialLoginFailProps> = ({ providerName, failType, retry }) => {
  const onClickRetry = useCallback(() => {
    retry();
  }, [retry]);

  const description = useMemo(() => {
    if (failType === 'DUPLICATE_ACCOUNT') {
      return 'This account already exists in your wallet. Please\ntry again with a different account. ';
    }
    return `Your sign-in attempt was unsuccessful. Please try\nagain with a valid ${providerName} account. `;
  }, [failType, providerName]);

  return (
    <StyledContainer>
      <View style={{ marginBottom: 16 }}>
        <Lottie animationData={AnimationLoginFailed} height={120} />
      </View>
      <WebTitleWithDescription
        title='Login Failed'
        description={description}
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

export default SocialLoginFail;
