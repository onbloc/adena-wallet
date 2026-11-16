import { ReactElement, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { Row, View, WebButton, WebCheckBox, WebText } from '@components/atoms';
import { WebSeedInput, WebTitleWithDescription } from '@components/molecules';
import { UseAccountImportReturn } from '@hooks/web/use-account-import-screen';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const SetMnemonicStep = ({
  useAccountImportScreenReturn,
}: {
  useAccountImportScreenReturn: UseAccountImportReturn;
}): ReactElement => {
  const { errMsg, isValidForm, updateInputValue, setInputType, onClickNext } =
    useAccountImportScreenReturn;
  const theme = useTheme();
  const [agreeWarning, setAgreeWarning] = useState(false);

  return (
    <StyledContainer>
      <WebTitleWithDescription
        title='Import Existing Wallet'
        description='Enter a seed phrase or your private key to import your existing wallet.'
      />
      <View style={{ paddingBottom: 8, marginTop: -6 }}>
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
        text='Next'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default SetMnemonicStep;
