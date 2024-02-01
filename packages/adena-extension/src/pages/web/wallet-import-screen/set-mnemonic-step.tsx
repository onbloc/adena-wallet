import { ReactElement, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import IconWarning from '@assets/web/warning.svg';

import { Row, View, WebButton, WebCheckBox, WebImg, WebText } from '@components/atoms';
import { WebSeedInput } from '@components/molecules';
import { UseWalletImportReturn } from '@hooks/web/use-wallet-import-screen';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledWarnBox = styled(Row)`
  column-gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
`;

const SetMnemonicStep = ({
  useWalletImportScreenReturn,
}: {
  useWalletImportScreenReturn: UseWalletImportReturn;
}): ReactElement => {
  const { setInputType, setInputValue, onClickNext, errMsg, isValidForm } =
    useWalletImportScreenReturn;
  const theme = useTheme();
  const [agreeWarning, setAgreeWarning] = useState(false);

  return (
    <StyledContainer>
      <StyledMessageBox>
        <WebText type='headline3'>Import Existing Wallet</WebText>
        <StyledWarnBox>
          <WebImg src={IconWarning} size={20} />
          <WebText type='body6' color={theme.webWarning._100}>
            Enter a seed phrase or your private key to import your existing wallet.
          </WebText>
        </StyledWarnBox>
      </StyledMessageBox>
      <WebSeedInput
        onChange={({ type, value }): void => {
          setInputValue(value);
          setInputType(type);
        }}
        errorMessage={errMsg}
      />

      <Row style={{ columnGap: 8, alignItems: 'center' }}>
        <WebCheckBox
          checked={agreeWarning}
          onClick={(): void => {
            setAgreeWarning(!agreeWarning);
          }}
        />
        <WebText type='body5' color={theme.webNeutral._500}>
          This will only be stored on this device. Adena can’t recover it for you.
        </WebText>
      </Row>

      <WebButton
        figure='primary'
        size='small'
        onClick={onClickNext}
        disabled={!agreeWarning || !isValidForm}
        style={{ justifyContent: 'center' }}
        text='Next'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default SetMnemonicStep;
