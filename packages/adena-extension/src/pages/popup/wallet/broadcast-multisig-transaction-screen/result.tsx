import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import { CommonFullContentLayout, Text, View } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import IconAccountInitializeFailed from '@assets/icon-account-initialize-failed';
import IconAccountInitializeSuccess from '@assets/icon-account-initialize-success';

interface BroadcastMultisigTransactionResultProps {
  status: 'SUCCESS' | 'FAILED';
}

const BroadcastMultisigTransactionResult: React.FC<BroadcastMultisigTransactionResultProps> = ({
  status,
}) => {
  const theme = useTheme();
  const { navigate } = useAppNavigate();

  const isSuccess = status === 'SUCCESS';

  const onClickClose = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  return (
    <CommonFullContentLayout>
      <StyledWrapper>
        {isSuccess ? <IconAccountInitializeSuccess /> : <IconAccountInitializeFailed />}
        <StyledDescriptionWrapper>
          <Text type='header4' textAlign='center'>
            {isSuccess ? 'Broadcast Success' : 'Broadcast Failed'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {isSuccess
              ? 'Your transaction has been successfully\nbroadcast to the network. You can check\nthe status on Gnoscan.'
              : 'Your transaction has failed. Please\nensure that your transaction is in the\ncorrect format and try again.'}
          </Text>
        </StyledDescriptionWrapper>
      </StyledWrapper>

      <BottomFixedButton text='Close' onClick={onClickClose} />
    </CommonFullContentLayout>
  );
};

export default BroadcastMultisigTransactionResult;

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
