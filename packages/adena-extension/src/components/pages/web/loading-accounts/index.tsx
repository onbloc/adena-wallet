import React from 'react';
import styled from 'styled-components';

import AnimationLoadingAccount from '@assets/web/loading-account-idle.gif';

import { View, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

interface WebLoadingAccountsProps {
  spacing?: number;
}

const WebLoadingAccounts: React.FC<WebLoadingAccountsProps> = ({ spacing = 0 }) => {
  return (
    <StyledContainer style={{ marginTop: `${spacing}px` }}>
      <WebImg src={AnimationLoadingAccount} height={120} />
      <WebTitleWithDescription
        title='Loading Accounts'
        description='We’re loading accounts. This will take a few seconds...'
        isCenter
      />
    </StyledContainer>
  );
};

export default WebLoadingAccounts;
