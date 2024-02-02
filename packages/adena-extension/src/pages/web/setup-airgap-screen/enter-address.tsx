import React, { useCallback, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebButton, WebErrorText, WebImg, WebInput, WebText } from '@components/atoms';

import IconAirgap from '@assets/web/airgap-green.svg';

const StyledContainer = styled(View)`
  width: 100%;
  height: 350px;
  row-gap: 24px;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledInputBox = styled(View)`
  row-gap: 12px;
  width: 100%;
`;

interface StyledInputProps {
  error: boolean;
  type: string;
  name: string;
  placeholder: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
const StyledInput = styled(WebInput) <StyledInputProps>`
  border: ${({ theme, error }): string => (error ? `1px solid ${theme.webError._200}` : '')};
  background-color: ${({ theme, error }): string => (error ? theme.webError._300 : '')};

  &:focus-visible {
    background-color: ${({ theme, error }): string => (error ? theme.webError._300 : '')};
  }
`;

const StyledButtonBox = styled(View)`
  align-items: flex-start;
`;

interface SetupAirgapEnterAddressProps {
  address: string;
  errorMessage: string | null;
  changeAddress: (address: string) => void;
  confirmAddress: () => void;
}

const SetupAirgapEnterAddress: React.FC<SetupAirgapEnterAddressProps> = ({
  address,
  errorMessage,
  changeAddress,
  confirmAddress,
}) => {
  const theme = useTheme();

  const disabledNextButton = useMemo(() => {
    return address === '' || errorMessage !== null;
  }, [address, errorMessage]);

  const onChangeAddressInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    changeAddress(value);
  }, []);

  return (
    <StyledContainer>
      <WebImg src={IconAirgap} size={90} />
      <StyledMessageBox>
        <WebText type='headline3'>Enter Your Address</WebText>
        <WebText type='body4' color={theme.webNeutral._500} style={{ whiteSpace: 'pre-line' }}>
          {'Enter the address that you will use to set up your airgapped account.'}
        </WebText>
      </StyledMessageBox>

      <StyledInputBox>
        <StyledInput
          error={errorMessage !== null}
          type='text'
          name='address'
          placeholder='Account Address'
          autoComplete='off'
          onChange={onChangeAddressInput}
        />
        {errorMessage && <WebErrorText text={errorMessage} />}
      </StyledInputBox>

      <StyledButtonBox>
        <WebButton
          figure='primary'
          size='small'
          onClick={confirmAddress}
          disabled={disabledNextButton}
          text='Next'
          rightIcon='chevronRight'
        />
      </StyledButtonBox>
    </StyledContainer>
  );
};

export default SetupAirgapEnterAddress;
