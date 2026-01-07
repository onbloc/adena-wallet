import React from 'react';
import styled from 'styled-components';

import { validateAddress } from 'adena-module';
import { MultisigAccountMode } from '@hooks/web/setup-multisig/use-setup-multisig-screen';

import { Row, View, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import WebWarningDescriptionBox from '@components/molecules/web-warning-description-box/web-warning-description-box';
import WebMainButton from '@components/atoms/web-main-button';
import IconAirgap from '@assets/web/airgap-green.svg';
import IconCreate from '@assets/web/icon-create';
import IconImport from '@assets/web/icon-import';

const description =
  'Adena does not rely on any backend servers for multisig — everything is executed fully on-chain for maximum security. Creating or importing a multisig account uses the same deterministic on-chain parameters.';

interface SetupMultisigInitProps {
  initSetup: (mode: MultisigAccountMode) => void;
  currentAddress: string | null;
}

const SetupMultisigInit: React.FC<SetupMultisigInitProps> = ({ initSetup, currentAddress }) => {
  const createMultisigAccountButtonRef = React.useRef<HTMLButtonElement>(null);
  const importMultisigAccountButtonRef = React.useRef<HTMLButtonElement>(null);

  const isCreateDisabled = !currentAddress || !validateAddress(currentAddress);

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

      <Row style={{ width: '100%', columnGap: 12 }}>
        <WebMainButton
          buttonRef={createMultisigAccountButtonRef}
          figure='primary'
          iconElement={<IconCreate />}
          text='Create Multisig Account'
          onClick={(): void => initSetup('CREATE')}
          disabled={isCreateDisabled}
        />
        <WebMainButton
          buttonRef={importMultisigAccountButtonRef}
          figure='secondary'
          iconElement={<IconImport />}
          text='Import Multisig Account'
          onClick={(): void => initSetup('IMPORT')}
        />
      </Row>
    </StyledContainer>
  );
};

export default SetupMultisigInit;

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;
