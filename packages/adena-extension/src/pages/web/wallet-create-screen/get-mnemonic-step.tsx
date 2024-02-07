import { ReactElement, useCallback, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import IconWarning from '@assets/web/warning.svg';

import { Row, View, WebButton, WebCheckBox, WebImg, WebText } from '@components/atoms';
import { WebSeedBox } from '@components/molecules';
import { UseWalletCreateReturn } from '@hooks/web/use-wallet-create-screen';
import { WebHoldButton } from '@components/atoms/web-hold-button';
import { WebCopyButton } from '@components/atoms/web-copy-button';
import { getTheme } from '@styles/theme';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const StyledMessageBox = styled(View)`
  row-gap: 12px;
`;

const StyledWarnBox = styled(Row)`
  column-gap: 4px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid ${getTheme('webWarning', '_100')}0a;
  background: ${getTheme('webWarning', '_100')}14;
`;

const GetMnemonicStep = ({
  useWalletCreateScreenReturn,
}: {
  useWalletCreateScreenReturn: UseWalletCreateReturn;
}): ReactElement => {
  const { seeds, onClickNext } = useWalletCreateScreenReturn;
  const theme = useTheme();
  const [showBlur, setShowBlur] = useState(true);
  const [ableToReveal, setAbleToReveal] = useState(false);
  const [agreeAbleToReveals, setAgreeAbleToReveals] = useState(false);
  const [checkSavedMnemonic, setCheckSavedMnemonic] = useState(false);

  const onFinishHold = useCallback((finished: boolean) => {
    setShowBlur(!finished);
  }, []);

  return (
    <StyledContainer>
      <StyledMessageBox>
        <WebText type='headline3'>Seed Phrase</WebText>
        <StyledWarnBox>
          <WebImg src={IconWarning} size={20} />
          <WebText type='body6' color={theme.webWarning._100}>
            This phrase is the only way to recover this wallet. DO NOT share it with anyone.
          </WebText>
        </StyledWarnBox>
      </StyledMessageBox>
      <WebSeedBox seeds={seeds.split(' ')} showBlur={showBlur} />

      {ableToReveal ? (
        <>
          <Row style={{ justifyContent: 'center', columnGap: 12, marginTop: 4 }}>

            <WebHoldButton onFinishHold={onFinishHold} />
            <WebCopyButton width={80} copyText={seeds} />
          </Row>
          <Row style={{ columnGap: 8, alignItems: 'center' }}>
            <WebCheckBox
              checked={checkSavedMnemonic}
              onClick={(): void => {
                setCheckSavedMnemonic(!checkSavedMnemonic);
              }}
            />
            <WebText type='body5' color={theme.webNeutral._500}>
              I have saved my seed phrase.
            </WebText>
          </Row>
        </>
      ) : (
        <Row style={{ columnGap: 8, alignItems: 'center' }}>
          <WebCheckBox
            checked={agreeAbleToReveals}
            onClick={(): void => {
              setAgreeAbleToReveals(!agreeAbleToReveals);
            }}
          />
          <WebText type='body5' color={theme.webNeutral._500}>
            This phrase will only be stored on this device. Adena can’t recover it for you.
          </WebText>
        </Row>
      )}

      {ableToReveal ? (
        <WebButton
          figure='primary'
          size='small'
          onClick={onClickNext}
          disabled={!checkSavedMnemonic}
          text='Next'
          rightIcon='chevronRight'
        />
      ) : (
        <WebButton
          figure='primary'
          size='small'
          onClick={(): void => {
            setAbleToReveal(true);
          }}
          disabled={!agreeAbleToReveals}
          style={{ justifyContent: 'center' }}
        >
          <WebText type='title4'>Reveal Seed Phrase</WebText>
        </WebButton>
      )}
    </StyledContainer>
  );
};

export default GetMnemonicStep;
