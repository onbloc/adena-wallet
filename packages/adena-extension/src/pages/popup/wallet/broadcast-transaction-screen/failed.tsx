import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import { CommonFullContentLayout, Text, View } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import IconFailed from '@assets/connect-fail-permission.svg';

const StyledFailedWrapper = styled(View)`
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

const BroadcastTransactionFailed: React.FC = () => {
  const theme = useTheme();
  const { navigate } = useAppNavigate();

  const onClickClose = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  return (
    <CommonFullContentLayout>
      <StyledFailedWrapper>
        <img src={IconFailed} alt='failed icon' />
        <StyledDescriptionWrapper>
          <Text type='header4' textAlign='center'>
            {'Transaction Failed'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {'Your transaction has failed. Please\nensure that your transaction is in the\ncorrect format and try again.'}
          </Text>
        </StyledDescriptionWrapper>
      </StyledFailedWrapper>

      <BottomFixedButton
        text='Close'
        onClick={onClickClose}
      />
    </CommonFullContentLayout>
  );
};

export default BroadcastTransactionFailed;