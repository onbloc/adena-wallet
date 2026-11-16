import React from 'react';
import styled from 'styled-components';

import { MultisigAccountMode } from '@hooks/web/setup-multisig/use-setup-multisig-screen';
import { MultisigConfig } from 'adena-module';

import { View, WebButton, WebErrorText, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import { WebMultisigSignerInput } from '@components/molecules/web-multisig-signer-input';
import { WebMultisigThresholdInput } from '@components/molecules/web-multisig-threshold-input';
import IconAirgap from '@assets/web/airgap-green.svg';

interface SetupMultisigConfigProps {
  currentAddress: string;
  multisigConfig: MultisigConfig;
  onSignerChange: (index: number, value: string) => void;
  onAddSigner: () => void;
  onRemoveSigner: (index: number) => void;
  onThresholdChange: (threshold: number) => void;
  onCreateMultisigAccount: () => Promise<void>;
  multisigConfigError: string | null;
  multisigAccountMode: MultisigAccountMode;
}

const SetupMultisigConfig: React.FC<SetupMultisigConfigProps> = ({
  currentAddress,
  multisigConfig,
  onSignerChange,
  onAddSigner,
  onRemoveSigner,
  onThresholdChange,
  multisigConfigError,
  onCreateMultisigAccount,
  multisigAccountMode,
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

    if (threshold < 1 || threshold > validSignersCount) {
      return true;
    }

    if (multisigConfigError !== null) {
      return true;
    }

    return false;
  }, [signers, threshold, multisigConfigError, validSignersCount]);

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
          mode={multisigAccountMode}
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
            onThresholdChange={onThresholdChange}
            multisigConfigError={multisigConfigError}
          />
          {multisigConfigError && (
            <WebErrorText text={multisigConfigError} alignItems='flex-start' />
          )}
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
  row-gap: 24px;
`;

const StyledInputBox = styled(View)`
  row-gap: 24px;
  width: 100%;
`;

const StyledButtonBox = styled(View)`
  align-items: flex-start;
`;
