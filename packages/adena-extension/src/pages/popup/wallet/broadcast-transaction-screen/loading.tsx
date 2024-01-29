import React from 'react';
import styled, { useTheme } from 'styled-components';

import { CommonFullContentLayout, Spinner, Text, View } from '@components/atoms';

const StyledLoadingWrapper = styled(View)`
  margin-top: 56px;
  gap: 23px;
  justify-content: center;
  align-items: center;
`;

const StyledDescriptionWrapper = styled(View)`
  gap: 12px;
  justify-content: center;
  align-items: center;
`;

const BroadcastTransactionLoading: React.FC = () => {
  const theme = useTheme();

  return (
    <CommonFullContentLayout>
      <StyledLoadingWrapper>
        <Spinner />
        <StyledDescriptionWrapper>
          <Text type='header4' textAlign='center'>
            {'Broadcasting...'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {'Your transaction is being broadcasted\nto the blockchain.'}
          </Text>
        </StyledDescriptionWrapper>
      </StyledLoadingWrapper>
    </CommonFullContentLayout>
  );
};

export default BroadcastTransactionLoading;