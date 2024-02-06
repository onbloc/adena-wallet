import React from 'react';
import styled from 'styled-components';

import AnimationLoadingAccount from '@assets/web/lottie/loading-accounts-success.json';

import { View } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

interface WebLoadingAccountsProps {
}

const WebLoadingAccounts: React.FC<WebLoadingAccountsProps> = () => {
  return (
    <StyledContainer>
      <Lottie animationData={AnimationLoadingAccount} height={120} />
      <WebTitleWithDescription
        title='Loading Accounts'
        description='We’re loading accounts. This will take a few seconds...'
        isCenter
      />
    </StyledContainer>
  );
};

export default WebLoadingAccounts;
