import React, { useCallback, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-rounded.svg';
import { View, WebButton, WebImg, WebText } from '@components/atoms';
import { ExportType } from '@hooks/web/wallet-export/use-wallet-export-screen';

const StyledContainer = styled(View)`
  row-gap: 24px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

interface WalletExportInitStepProps {
  exportType: ExportType;
  initWalletExport: () => void;
}

const WalletExportInitStep: React.FC<WalletExportInitStepProps> = ({
  exportType,
  initWalletExport,
}) => {
  const theme = useTheme();

  const description = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'You’re about to reveal your private key. Your private key is the only way to\nrecover your account. Be sure to store it in a safe place.'
    }
    return 'You are about to reveal your seed phrase. Your seed phrase is the only\nway to recover your wallet. Be sure to store it in a safe place.';
  }, [exportType]);

  const onClickNext = useCallback(() => {
    initWalletExport();
  }, [initWalletExport]);

  return (
    <StyledContainer>
      <WebImg src={IconAlert} />
      <StyledMessageBox>
        <WebText type='headline3'>Sensitive Information Ahead</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>{description}</WebText>
      </StyledMessageBox>
      <WebButton
        figure='primary'
        size='small'
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default WalletExportInitStep;
