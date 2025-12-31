import React from 'react';
import styled from 'styled-components';

import { View, WebButton, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import WebWarningDescriptionBox from '@components/molecules/web-warning-description-box/web-warning-description-box';

import IconAirgap from '@assets/web/airgap-green.svg';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const StyledButtonWrapper = styled(View)`
  align-items: flex-start;
`;

const description = `Adena does not rely on any backend servers for multisig — everything is executed fully on-chain for maximum security. Creating or importing a multisig account uses the same deterministic on-chain parameters.`;

interface SetupMultisigInitProps {
  initSetup: () => void;
}

const SetupMultisigInit: React.FC<SetupMultisigInitProps> = ({ initSetup }) => {
  return (
    <StyledContainer>
      <View style={{ marginBottom: 8 }}>
        <WebImg src={IconAirgap} size={88} />
      </View>

      <WebTitleWithDescription
        title='Set Up Multi-sig Account'
        description={'You can create or import a multi-sig account on Adena.'}
        marginBottom={-6}
      />

      <WebWarningDescriptionBox description={description} />

      <StyledButtonWrapper>
        <WebButton
          figure='primary'
          size='small'
          onClick={initSetup}
          text='Next'
          rightIcon='chevronRight'
        />
      </StyledButtonWrapper>
    </StyledContainer>
  );
};

export default SetupMultisigInit;
