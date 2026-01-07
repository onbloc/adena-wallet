import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import { CommonFullContentLayout, Text, View } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import IconAccountInitializeFailed from '@assets/icon-account-initialize-failed';
import IconAccountInitializeSuccess from '@assets/icon-account-initialize-success';

interface SignMultisigTransactionResultProps {
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string | null;
}

const SignMultisigTransactionResult: React.FC<SignMultisigTransactionResultProps> = ({
  status,
  errorMessage,
}) => {
  const theme = useTheme();
  const { navigate } = useAppNavigate();

  const isSuccess = status === 'SUCCESS';

  const getFailureMessage = (): string => {
    if (errorMessage) {
      return errorMessage;
    }
    return 'Your signature has failed. Please\ncheck your transaction details and\ntry again.';
  };

  const onClickClose = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  return (
    <CommonFullContentLayout>
      <StyledWrapper>
        {isSuccess ? <IconAccountInitializeSuccess /> : <IconAccountInitializeFailed />}
        <StyledDescriptionWrapper>
          <Text type='header4' textAlign='center'>
            {isSuccess ? 'Signature Success' : 'Signature Failed'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {isSuccess
              ? 'Your transaction has been successfully\nsigned. The signed transaction is ready\nto be broadcast to the network.'
              : getFailureMessage()}
          </Text>
        </StyledDescriptionWrapper>
      </StyledWrapper>

      <BottomFixedButton text='Close' onClick={onClickClose} />
    </CommonFullContentLayout>
  );
};

export default SignMultisigTransactionResult;

const StyledWrapper = styled(View)`
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
