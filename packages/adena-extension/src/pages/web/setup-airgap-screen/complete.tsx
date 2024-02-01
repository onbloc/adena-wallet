import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import { Row, View, WebButton, WebImg, WebInput, WebText } from '@components/atoms';

import IconAirgap from '@assets/web/airgap-green.svg';
import IconCheck from '@assets/web/web-check-circle.svg';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  height: 350px;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledInputBox = styled(Row)`
  gap: 12px;
  width: calc(100% + 30px);
`;

const StyledInput = styled(WebInput)`
  width: 100%;
`;

const StyledButtonBox = styled(View)`
  align-items: flex-start;
`;

interface SetupAirgapCompleteScreenProps {
  address: string;
  addAccount: (password?: string) => void;
}

const SetupAirgapCompleteScreen: React.FC<SetupAirgapCompleteScreenProps> = ({
  address,
  addAccount,
}) => {
  const theme = useTheme();

  const onClickNext = useCallback(() => {
    addAccount();
  }, [addAccount]);

  return (
    <StyledContainer>
      <WebImg src={IconAirgap} size={90} />
      <StyledMessageBox>
        <WebText type='headline3'>Account Synced!</WebText>
        <WebText type='body4' color={theme.webNeutral._500} style={{ whiteSpace: 'pre-line' }}>
          {
            'Your account has been synced to Adena.\nConfirm your address below and click on Next to continue.'
          }
        </WebText>
      </StyledMessageBox>

      <StyledInputBox>
        <StyledInput
          type='text'
          name='address'
          placeholder='Account Address'
          value={address}
          readOnly
        />
        <WebImg src={IconCheck} size={20} />
      </StyledInputBox>

      <StyledButtonBox>
        <WebButton
          figure='primary'
          size='small'
          onClick={onClickNext}
          text='Next'
          rightIcon='chevronRight'
        />
      </StyledButtonBox>
    </StyledContainer>
  );
};

export default SetupAirgapCompleteScreen;
