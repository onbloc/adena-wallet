import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import { CommonFullContentLayout, Text, View } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import IconFailed from '@assets/connect-fail-permission.svg';

const StyledFailedWrapper = styled(View)`
  margin-top: 56px;
  gap: 23px;
  justify-content: center;
  align-items: center;
  padding: 0 20px;
`;

const StyledDescriptionWrapper = styled(View)`
  gap: 12px;
  justify-content: center;
  align-items: center;
`;

const ApproveSignFailedScreen: React.FC = () => {
  const theme = useTheme();
  const { navigate } = useAppNavigate();

  const onClickClose = useCallback(() => {
    window.close();
  }, [navigate]);

  return (
    <CommonFullContentLayout>
      <StyledFailedWrapper>
        <img src={IconFailed} alt='failed icon' />
        <StyledDescriptionWrapper>
          <Text type='header4' textAlign='center'>
            {'Cannot Sign Transaction'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {'You cannot sign transactions when\nusing an airgap account. Upload a\nsigned transaction file or use another account.'}
          </Text>
        </StyledDescriptionWrapper>
      </StyledFailedWrapper>

      <BottomFixedButton
        fill={false}
        text='Close'
        onClick={onClickClose}
      />
    </CommonFullContentLayout>
  );
};

export default ApproveSignFailedScreen;