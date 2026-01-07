import React from 'react';
import styled from 'styled-components';

import { MAX_SIGNERS } from '@hooks/web/setup-multisig/use-setup-multisig-screen';

import { Pressable, View, WebText, WebInputWithLabel, Icon } from '@components/atoms';

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
    <StyledContainer style={{ alignItems: 'center' }}>
      <View style={{ rowGap: 16, width: '100%' }}>
        {signers.map((signer, index) => (
          <StyledInputRow key={`signer-${index}`}>
            <WebInputWithLabel
              label={`Signer #${index + 1}`}
              value={signer}
              onChange={(value): void => onSignerChange(index, value)}
              disabled={index === 0 && isFirstInputDisabled}
              placeholder={'Account Address'}
              error={hasError}
            />
            {index >= 2 && (
              <StyledCloseButton type='button' onClick={(): void => onRemoveSigner(index)}>
                <Icon name='iconCancel' />
              </StyledCloseButton>
            )}
          </StyledInputRow>
        ))}
      </View>

      <StyledAddButton onClick={onAddSigner} isDisabled={isMaxSigners}>
        <StyledButtonText type='body4' isDisabled={isMaxSigners}>
          Add More Signer
        </StyledButtonText>
      </StyledAddButton>
    </StyledContainer>
  );
};

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 16px;
`;

const StyledAddButton = styled(Pressable)<{ isDisabled: boolean }>`
  display: flex;
  width: 128px;
  height: 32px;
  padding: 8px 16px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  background: ${({ isDisabled }): string =>
    isDisabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)'};
  position: relative;
  transition: all 0.2s;
  cursor: ${({ isDisabled }): string => (isDisabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ isDisabled }): string => (isDisabled ? '0.5' : '1')};
  pointer-events: ${({ isDisabled }): string => (isDisabled ? 'none' : 'auto')};

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    padding: 1px;
    background: ${({ isDisabled }): string =>
      isDisabled
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%)'};
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  &:hover {
    background: ${({ isDisabled }): string =>
      isDisabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.2)'};
  }
`;

const StyledCloseButton = styled.button`
  display: inline-flex;
  width: 14px;
  height: 14px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  svg {
    width: 100%;
    height: 100%;

    line {
      transition: 0.2s;
      stroke: ${({ theme }): string => theme.webNeutral._500};
    }
  }

  &:hover {
    svg {
      line {
        stroke: ${({ theme }): string => theme.webNeutral._100};
      }
    }
  }
`;

const StyledButtonText = styled(WebText)<{ isDisabled: boolean }>`
  color: ${({ theme, isDisabled }): string =>
    isDisabled ? theme.webNeutral._500 : theme.webNeutral._100};
  font-family: Inter;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: -0.12px;
`;

const StyledInputRow = styled(View)`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  gap: 8px;
`;
