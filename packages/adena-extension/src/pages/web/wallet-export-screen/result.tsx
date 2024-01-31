import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { FlattenSimpleInterpolation, css, keyframes, useTheme } from 'styled-components';

import IconWarning from '@assets/web/warning.svg';
import { Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import { ExportType } from '@hooks/web/wallet-export/use-wallet-export-screen';
import { TermsCheckbox, WebSeedBox } from '@components/molecules';
import { WebPrivateKeyBox } from '@components/molecules/web-private-key-box';
import { AdenaStorage } from '@common/storage';
import { WALLET_EXPORT_TYPE_STORAGE_KEY } from '@common/constants/storage.constant';

const StyledContainer = styled(View)`
  width: 416px;
  row-gap: 16px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  width: 100%;
  row-gap: 12px;
`;

const StyledWarnBox = styled(View)`
  width: 100%;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
`;

const StyledInputBox = styled(View)`
  width: 100%;
  gap: 12px;
`;

const StyledTermsBox = styled(View)`
  gap: 16px;
  padding: 8px 0;
`;

interface WalletExportResultProps {
  exportType: ExportType;
  exportData: string | null;
}

const fill = keyframes`
  from {
   width: 0;
  }
  to {
   width: 100%;
  }
`;

const StyledHoldButton = styled(WebButton)<{ pressed: boolean }>`
  position: relative;
  overflow: hidden;
  ${({ pressed: onPress }): FlattenSimpleInterpolation | undefined =>
    onPress
      ? css`
          ::before {
            content: '';
            z-index: -1;
            position: absolute;
            top: 0px;
            left: 0px;
            height: 100%;
            background-color: rgba(0, 89, 255, 0.32);
            animation: ${fill} 3s forwards;
          }
        `
      : undefined}
`;
const WalletExportResult: React.FC<WalletExportResultProps> = ({ exportType, exportData }) => {
  const theme = useTheme();
  const [blur, setBlur] = useState(true);
  const [onPress, setOnPress] = useState(false);

  const title = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'Export Private Key';
    }
    return 'Reveal Seed Phrase';
  }, [exportType]);

  const warningMessage = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'You’re about to reveal your seed phrase. Please carefully review the\nchecklist below.';
    }
    return 'You’re about to reveal your private key. Please carefully review\nthe checklist below.';
  }, [exportType]);

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

  const copyData = useCallback(() => {
    const copied = exportData || '';
    navigator.clipboard.writeText(copied);
  }, [exportData]);

  const onClickDone = (): void => {
    AdenaStorage.session()
      .remove(WALLET_EXPORT_TYPE_STORAGE_KEY)
      .then(() => {
        window.close();
      });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (onPress) {
      timer = setTimeout(() => {
        setBlur(false);
      }, 3000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [onPress]);

  return (
    <StyledContainer>
      <StyledMessageBox>
        <WebText type='headline3'>{title}</WebText>
        <StyledWarnBox>
          <Row style={{ gap: 2, alignItems: 'center' }}>
            <WebImg src={IconWarning} size={20} />
            <WebText type='title6' color={theme.webWarning._100} style={{ height: 14 }}>
              Approach with caution!
            </WebText>
          </Row>
          <WebText type='body6' color={theme.webWarning._100}>
            {warningMessage}
          </WebText>
        </StyledWarnBox>
      </StyledMessageBox>

      <StyledInputBox>
        {exportType === 'SEED_PHRASE' && <WebSeedBox seeds={seeds} showBlur={blur} />}
        {exportType === 'PRIVATE_KEY' && (
          <WebPrivateKeyBox privateKey={privateKey} showBlur={blur} />
        )}
        <Row style={{ gap: 12, justifyContent: 'center' }}>
          <StyledHoldButton
            figure='quaternary'
            size='small'
            onMouseDown={(): void => {
              setOnPress(true);
            }}
            onMouseUp={(): void => {
              setOnPress(false);
              setBlur(true);
            }}
            text='Hold to Reveal'
            textType='body6'
            style={{ borderRadius: 8 }}
            pressed={onPress}
          />
          <WebButton
            figure='quaternary'
            size='small'
            onClick={copyData}
            text='Copy'
            textType='body6'
            style={{ borderRadius: 8 }}
          />
        </Row>
      </StyledInputBox>

      <StyledTermsBox>
        <TermsCheckbox
          id='term01'
          checked={true}
          onChange={(): void => {
            return;
          }}
          text='Anyone with the phrase will have full control over my funds.'
          tabIndex={1}
          margin='0'
        />
        <TermsCheckbox
          id='term02'
          checked={true}
          onChange={(): void => {
            return;
          }}
          text='I will never share my seed phrase with anyone.'
          tabIndex={2}
          margin='0'
        />
      </StyledTermsBox>

      <WebButton figure='primary' size='full' onClick={onClickDone} text='Done' />
    </StyledContainer>
  );
};

export default WalletExportResult;
