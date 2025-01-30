import React, { useCallback, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import IconWarning from '@assets/web/warning.svg';
import { WALLET_EXPORT_TYPE_STORAGE_KEY } from '@common/constants/storage.constant';
import { AdenaStorage } from '@common/storage';
import { Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import { WebCopyButton } from '@components/atoms/web-copy-button';
import { WebHoldButton } from '@components/atoms/web-hold-button';
import { WebSeedBox } from '@components/molecules';
import { WebPrivateKeyBox } from '@components/molecules/web-private-key-box';
import { ExportType } from '@hooks/web/wallet-export/use-wallet-export-screen';
import { getTheme } from '@styles/theme';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 16px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  width: 100%;
  row-gap: 12px;
`;

const StyledWarnBox = styled(Row)<{ center: boolean }>`
  width: 100%;
  padding: 12px 8px;
  border-radius: 8px;
  align-items: ${({ center }): string => (center ? 'center' : 'flex-start')};
  gap: 4px;
  border: 1px solid ${getTheme('webWarning', '_100')}0a;
  background: ${getTheme('webWarning', '_100')}14;
`;

const StyledInputBox = styled(View)`
  width: 100%;
  gap: 16px;
  margin-bottom: 8px;
`;

interface WalletExportResultProps {
  exportType: ExportType;
  exportData: string | null;
}

const WalletExportResult: React.FC<WalletExportResultProps> = ({ exportType, exportData }) => {
  const theme = useTheme();
  const [blur, setBlur] = useState(true);
  const [initializedDone, setInitializedDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'Export Private Key';
    }
    return 'Reveal Seed Phrase';
  }, [exportType]);

  const warningMessage = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'Do not share your private key! Anyone with your private key will have full control of your wallet.';
    }
    return 'Your seed phrase is the only way to recover your wallet. Keep it somewhere safe and secret.';
  }, [exportType]);

  const warningCopiedMessage = useMemo(() => {
    if (!copied) {
      return '';
    }
    return 'You have copied sensitive info. Make sure you do not paste it in public or shared environments, and clear your clipboard as soon as you’ve used it.';
  }, [copied]);

  const seeds = useMemo((): string[] => {
    if (exportType !== 'SEED_PHRASE' || !exportData) {
      return [];
    }
    return exportData.split(' ');
  }, [exportType, exportData]);

  const privateKey = useMemo((): string => {
    if (exportType !== 'PRIVATE_KEY' || !exportData) {
      return '';
    }
    return exportData;
  }, [exportType, exportData]);

  const onMouseDownDone = (): void => {
    setInitializedDone(true);
  };

  const onFinishHold = useCallback((finished: boolean) => {
    setBlur(!finished);
  }, []);

  const onClickDone = (): void => {
    if (!initializedDone) {
      return;
    }

    AdenaStorage.session()
      .remove(WALLET_EXPORT_TYPE_STORAGE_KEY)
      .then(() => {
        window.close();
      });
  };

  const onCopy = (): void => {
    setCopied(true);
  };

  return (
    <StyledContainer>
      <StyledMessageBox>
        <WebText type='headline2'>{title}</WebText>
        <StyledWarnBox center={exportType === 'SEED_PHRASE'}>
          <WebImg src={IconWarning} size={20} />
          <WebText type='body6' color={theme.webWarning._100}>
            {warningMessage}
          </WebText>
        </StyledWarnBox>

        {warningCopiedMessage && (
          <StyledWarnBox center={exportType === 'SEED_PHRASE'}>
            <WebImg src={IconWarning} size={20} />
            <WebText type='body6' color={theme.webWarning._100}>
              {warningCopiedMessage}
            </WebText>
          </StyledWarnBox>
        )}
      </StyledMessageBox>

      <StyledInputBox>
        {exportType === 'SEED_PHRASE' && <WebSeedBox seeds={seeds} showBlur={blur} />}
        {exportType === 'PRIVATE_KEY' && (
          <WebPrivateKeyBox privateKey={privateKey} showBlur={blur} />
        )}
        <Row style={{ gap: 16, justifyContent: 'center' }}>
          <WebHoldButton onFinishHold={onFinishHold} />
          <WebCopyButton width={80} copyText={exportData || ''} onCopy={onCopy} />
        </Row>
      </StyledInputBox>

      <WebButton
        figure='primary'
        size='full'
        onMouseDown={onMouseDownDone}
        onClick={onClickDone}
        text='Done'
      />
    </StyledContainer>
  );
};

export default WalletExportResult;
