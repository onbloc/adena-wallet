import { ReactElement, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-circle.svg';
import IconWarning from '@assets/web/warning.svg';

import { Row, View, WebButton, WebCheckBox, WebImg, WebInput, WebText } from '@components/atoms';
import { UseAccountImportReturn } from '@hooks/web/use-account-import-screen';

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

const StyledItem = styled(Row) <{ error: boolean }>`
  position: relative;
  overflow: hidden;
  height: 40px;
  border-radius: 10px;
  background: ${({ error, theme }): string =>
    error ? theme.webError._300 : theme.webNeutral._900};
  border: 1px solid
    ${({ error, theme }): string => (error ? theme.webError._200 : theme.webNeutral._600)};
  box-shadow: ${({ error }): string =>
    error
      ? '0px 0px 0px 3px rgba(235, 84, 94, 0.12), 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);'
      : '0px 0px 0px 3px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);'};
`;

const StyledInput = styled(WebInput)`
  flex: 1;
  width: 100%;
  border-radius: 0;
  border: none;
  outline: none;
  background: transparent;

  :focus-visible {
    background: transparent;
  }
`;
const SetPrivateKeyStep = ({
  useAccountImportScreenReturn,
}: {
  useAccountImportScreenReturn: UseAccountImportReturn;
}): ReactElement => {
  const { privateKey, setPrivateKey, onClickNext, errMsg, isValidForm } =
    useAccountImportScreenReturn;
  const theme = useTheme();
  const [agreeWarning, setAgreeWarning] = useState(false);

  return (
    <StyledContainer>
      <StyledMessageBox>
        <WebText type='headline3'>Import Existing Wallet</WebText>
        <StyledWarnBox>
          <WebImg src={IconWarning} size={20} />
          <WebText type='body6' color={theme.webWarning._100}>
            Enter a private key to import your existing wallet.
          </WebText>
        </StyledWarnBox>
      </StyledMessageBox>
      <View style={{ rowGap: 12 }}>
        <StyledItem error={!!errMsg}>
          <StyledInput
            type='password'
            value={privateKey}
            placeholder='Private Key'
            onChange={({ target: { value } }): void => {
              setPrivateKey(value);
            }}
          />
        </StyledItem>
        {!!errMsg && (
          <Row style={{ columnGap: 6, alignItems: 'center' }}>
            <WebImg src={IconAlert} size={20} color={theme.webError._100} />
            <WebText type='body5' color={theme.webError._100}>
              {errMsg}
            </WebText>
          </Row>
        )}
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

export default SetPrivateKeyStep;
