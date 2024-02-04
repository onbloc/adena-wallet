import { ReactElement, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { Row, View, WebButton, WebCheckBox, WebText } from '@components/atoms';
import { WebSeedInput } from '@components/molecules';
import { UseWalletImportReturn } from '@hooks/web/use-wallet-import-screen';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const SetMnemonicStep = ({
  useWalletImportScreenReturn,
}: {
  useWalletImportScreenReturn: UseWalletImportReturn;
}): ReactElement => {
  const { setInputType, updateInputValue, onClickNext, errMsg, isValidForm } =
    useWalletImportScreenReturn;
  const theme = useTheme();
  const [agreeWarning, setAgreeWarning] = useState(false);

  return (
    <StyledContainer>
      <StyledMessageBox>
        <WebText type='headline3'>Import Existing Wallet</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Enter a seed phrase or your private key to import your existing wallet.
        </WebText>
      </StyledMessageBox>
      <View style={{ paddingBottom: 8 }}>
        <WebSeedInput
          onChange={({ type, value }): void => {
            updateInputValue(value);
            setInputType(type);
          }}
          errorMessage={errMsg}
        />
      </View>

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
