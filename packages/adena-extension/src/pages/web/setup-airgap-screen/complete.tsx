import React, { useCallback } from 'react';
import styled from 'styled-components';

import { Row, View, WebButton, WebImg, WebInput } from '@components/atoms';

import IconAirgap from '@assets/web/airgap-green.svg';
import IconCheck from '@assets/web/web-check-circle.svg';
import WebTitleWithDescription from '@components/molecules/web-title-with-description';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  height: 350px;
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
  const onClickNext = useCallback(() => {
    addAccount();
  }, [addAccount]);

  return (
    <StyledContainer>
      <WebImg src={IconAirgap} size={88} />

      <WebTitleWithDescription
        title={{
          text: 'Account synced!',
        }}
        description={{
          text: 'Your account has been synced to Adena.\nConfirm your address below and click on Next to continue.',
        }}
      />

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
