import React from 'react';

import { MAX_SIGNERS } from '@hooks/web/setup-multisig/use-setup-multisig-screen';

import * as S from './web-multisig-signer-input.styles';
import { View, WebInputWithLabel, Icon } from '@components/atoms';

type MultisigAccountMode = 'CREATE' | 'IMPORT';

interface WebMultisigSignerInputProps {
  mode: MultisigAccountMode;
  currentAddress?: string;
  signers: string[];
  onSignerChange: (index: number, value: string) => void;
  onAddSigner: () => void;
  onRemoveSigner: (index: number) => void;
  multisigConfigError: string | null;
}

export const WebMultisigSignerInput = ({
  mode,
  currentAddress,
  signers,
  onAddSigner,
  onRemoveSigner,
  onSignerChange,
  multisigConfigError,
}: WebMultisigSignerInputProps): React.ReactElement => {
  const isFirstInputDisabled = mode === 'CREATE' && !!currentAddress;

  const isMaxSigners = React.useMemo(() => {
    return signers.length === MAX_SIGNERS;
  }, [signers]);

  const hasError = Boolean(multisigConfigError);

  return (
    <S.StyledContainer style={{ alignItems: 'center' }}>
      <View style={{ rowGap: 16, width: '100%' }}>
        {signers.map((signer, index) => (
          <S.StyledInputRow key={`signer-${index}`}>
            <WebInputWithLabel
              label={`Signer #${index + 1}`}
              value={signer}
              onChange={(value): void => onSignerChange(index, value)}
              disabled={index === 0 && isFirstInputDisabled}
              placeholder={'Account Address'}
              error={hasError}
            />
            {index >= 2 && (
              <S.StyledCloseButton type='button' onClick={(): void => onRemoveSigner(index)}>
                <Icon name='iconCancel' />
              </S.StyledCloseButton>
            )}
          </S.StyledInputRow>
        ))}
      </View>

      <S.StyledAddButton onClick={onAddSigner} isDisabled={isMaxSigners}>
        <S.StyledButtonText type='body4' isDisabled={isMaxSigners}>
          Add More Signer
        </S.StyledButtonText>
      </S.StyledAddButton>
    </S.StyledContainer>
  );
};
