import { CommonFullContentLayout, Spinner, Text, View } from '@components/atoms';
import React from 'react';
import styled, { useTheme } from 'styled-components';

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

export const TransactionProgressLoading: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => {
  const theme = useTheme();

  return (
    <CommonFullContentLayout>
      <StyledLoadingWrapper>
        <Spinner />
        <StyledDescriptionWrapper>
          <Text type='header4' textAlign='center'>
            {title}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {description}
          </Text>
        </StyledDescriptionWrapper>
      </StyledLoadingWrapper>
    </CommonFullContentLayout>
  );
};

const BroadcastTransactionLoading: React.FC = () => (
  <TransactionProgressLoading
    title='Broadcasting...'
    description='Your transaction is being broadcasted.'
  />
);

export default BroadcastTransactionLoading;
