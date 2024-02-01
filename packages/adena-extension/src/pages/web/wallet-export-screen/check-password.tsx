import React, { useCallback, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import IconWarning from '@assets/web/warning.svg';
import { Row, View, WebButton, WebErrorText, WebImg, WebInput, WebText } from '@components/atoms';
import { ExportType } from '@hooks/web/wallet-export/use-wallet-export-screen';
import { TermsCheckbox } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 552px;
  height: 344px;
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

interface WalletExportCheckPasswordProps {
  exportType: ExportType;
  checkPassword: (password: string) => Promise<boolean>;
  moveExport: (password: string) => Promise<void>;
}

const WalletExportCheckPassword: React.FC<WalletExportCheckPasswordProps> = ({
  exportType,
  checkPassword,
  moveExport,
}) => {
  const theme = useTheme();

  const [password, setPassword] = useState('');
  const [checkedTerm01, setCheckedTerm01] = useState(false);
  const [checkedTerm02, setCheckedTerm02] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasError = useMemo(() => {
    return errorMessage !== null;
  }, [errorMessage]);

  const title = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'Export Private Key';
    }
    return 'Reveal Seed Phrase';
  }, [exportType]);

  const warningMessage = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'You’re about to export your private key. Please carefully review the checklist below.'
    }
    return 'You’re about to reveal your seed phrase. Please carefully review the checklist below.';
  }, [exportType]);

  const term01Text = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'Anyone with the private key will have full control over my funds.'
    }
    return 'Anyone with the phrase will have full control over my funds.';
  }, [exportType]);

  const term02Text = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'I will never share my private key with anyone.'
    }
    return 'I will never share my seed phrase with anyone.';
  }, [exportType]);

  const availableCheckPassword = useMemo(() => {
    return checkedTerm01 && checkedTerm02;
  }, [checkedTerm01, checkedTerm02]);

  const onChangePassword = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setErrorMessage(null);
    setPassword(value);
  }, []);

  const onClickNext = useCallback(async () => {
    if (!availableCheckPassword) {
      return;
    }
    const checkedPassword = await checkPassword(password)
    if (checkedPassword) {
      moveExport(password);
    } else {
      setErrorMessage('Invalid password')
    }
  }, [availableCheckPassword, password, checkPassword, moveExport]);

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
        <WebInput
          type='password'
          name='password'
          width='100%'
          placeholder='Password'
          onChange={onChangePassword}
          error={hasError}
        />
        {errorMessage && <WebErrorText text={errorMessage} />}
      </StyledInputBox>

      <StyledTermsBox>
        <TermsCheckbox
          id='term01'
          checked={checkedTerm01}
          onChange={(): void => setCheckedTerm01(!checkedTerm01)}
          text={term01Text}
          tabIndex={1}
          margin='0'
        />
        <TermsCheckbox
          id='term02'
          checked={checkedTerm02}
          onChange={(): void => setCheckedTerm02(!checkedTerm02)}
          text={term02Text}
          tabIndex={2}
          margin='0'
        />
      </StyledTermsBox>

      <WebButton
        figure='primary'
        size='full'
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
        disabled={!availableCheckPassword}
      />
    </StyledContainer>
  );
};

export default WalletExportCheckPassword;
