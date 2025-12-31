import React from 'react';
import styled from 'styled-components';

import { MultisigAccountMode } from '@hooks/web/setup-multisig/use-setup-multisig-screen';
import { MultisigConfig } from 'adena-module';

import { View, WebButton, WebErrorText, WebImg } from '@components/atoms';
import {
  WebTitleWithDescription,
  WebMultisigSignerInput,
  WebMultisigThresholdInput,
} from '@components/molecules';
import IconAirgap from '@assets/web/airgap-green.svg';

interface SetupMultisigConfigProps {
  currentAddress: string;
  multisigConfig: MultisigConfig;
  initMultisigConfig: (currentAddress?: string, mode?: MultisigAccountMode) => void;
  onSignerChange: (index: number, value: string) => void;
  onAddSigner: () => void;
  onRemoveSigner: (index: number) => void;
  onThresholdChange: (threshold: number) => void;
  onCreateMultisigAccount: () => Promise<void>;
  multisigConfigError: string | null;
}

const SetupMultisigConfig: React.FC<SetupMultisigConfigProps> = ({
  currentAddress,
  multisigConfig,
  onSignerChange,
  onAddSigner,
  onRemoveSigner,
  initMultisigConfig,
  onThresholdChange,
  multisigConfigError,
  onCreateMultisigAccount,
}) => {
  const { signers, threshold } = multisigConfig;

  const validSignersCount = React.useMemo(() => {
    return Math.max(1, signers.filter((signer) => signer.trim() !== '').length);
  }, [signers]);

  const disabledNextButton = React.useMemo(() => {
    if (signers.some((signer) => signer.trim() === '')) {
      return true;
    }

    const validSigners = signers.filter((signer) => signer.trim() !== '');

    if (validSigners.length < 2) {
      return true;
    }

    if (new Set(validSigners).size !== validSigners.length) {
      return true;
    }

    if (threshold < 1 || threshold > validSignersCount) {
      return true;
    }

    if (multisigConfigError !== null) {
      return true;
    }

    return false;
  }, [signers, threshold, multisigConfigError, validSignersCount]);

  React.useEffect(() => {
    const hasNoSigners = multisigConfig.signers.every((signer) => signer === '');

    if (hasNoSigners) {
      initMultisigConfig(currentAddress, 'CREATE');
    }
  }, [currentAddress, multisigConfig.signers, initMultisigConfig]);

  return (
    <StyledContainer>
      <View style={{ marginBottom: 8 }}>
        <WebImg src={IconAirgap} size={88} />
      </View>

      <WebTitleWithDescription
        title='Set Up Multi-sig Account'
        description='Enter the required information for your multisig account. Please make sure all addresses and threshold are correct — they cannot be changed after setup.'
        descriptionLetterSpacing={'-0.40px'}
        marginBottom={-6}
      />

      <StyledInputBox>
        <WebMultisigSignerInput
          mode={'CREATE'}
          currentAddress={currentAddress}
          signers={signers}
          onAddSigner={onAddSigner}
          onRemoveSigner={onRemoveSigner}
          onSignerChange={onSignerChange}
          multisigConfigError={multisigConfigError}
        />
        <View style={{ rowGap: 12 }}>
          <WebMultisigThresholdInput
            threshold={threshold}
            maxThreshold={validSignersCount}
            onThresholdChange={onThresholdChange}
            multisigConfigError={multisigConfigError}
          />
          {multisigConfigError && <WebErrorText text={multisigConfigError} />}
        </View>
      </StyledInputBox>

      <StyledButtonBox>
        <WebButton
          figure='primary'
          size='small'
          onClick={onCreateMultisigAccount}
          disabled={disabledNextButton}
          text='Next'
          rightIcon='chevronRight'
        />
      </StyledButtonBox>
    </StyledContainer>
  );
};

export default SetupMultisigConfig;

const StyledContainer = styled(View)`
  width: 100%;
  /* height: 350px; */
  row-gap: 24px;
`;

const StyledInputBox = styled(View)`
  row-gap: 24px;
  width: 100%;
`;

const StyledButtonBox = styled(View)`
  align-items: flex-start;
`;
