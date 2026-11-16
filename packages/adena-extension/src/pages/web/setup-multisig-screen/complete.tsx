import React from 'react';
import styled from 'styled-components';

import { Row, View, WebButton, WebImg, WebInput } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';

import IconCheck from '@assets/web/web-check-circle.svg';

interface SetupMultisigCompleteScreenProps {
  address: string;
  onNext: () => void;
}

const SetupMultisigCompleteScreen: React.FC<SetupMultisigCompleteScreenProps> = ({
  address,
  onNext,
}) => {
  return (
    <StyledContainer>
      <View style={{ marginBottom: 8 }}></View>
      <WebTitleWithDescription
        title='Account Added!'
        description={
          'Your multi-sig account has been added to Adena. \nConfirm your address below and click on Next to continue.'
        }
        marginBottom={-6}
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
          onClick={onNext}
          text='Next'
          rightIcon='chevronRight'
        />
      </StyledButtonBox>
    </StyledContainer>
  );
};

export default SetupMultisigCompleteScreen;

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
