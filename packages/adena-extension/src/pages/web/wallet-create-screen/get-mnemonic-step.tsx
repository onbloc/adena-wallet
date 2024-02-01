import { ReactElement, useEffect, useState } from 'react';
import styled, { FlattenSimpleInterpolation, css, keyframes, useTheme } from 'styled-components';

import IconWarning from '@assets/web/warning.svg';
import IconCopy from '@assets/web/copy.svg';

import { Row, View, WebButton, WebCheckBox, WebImg, WebText } from '@components/atoms';
import { WebSeedBox } from '@components/molecules';
import { UseWalletCreateReturn } from '@hooks/web/use-wallet-create-screen';

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

const StyledButton = styled(WebButton)`
  border-radius: 8px;
  :hover {
    background-color: rgba(255, 255, 255, 0.08);
  }
`;

const fill = keyframes`
  from {
   width: 0;
  }
  to {
   width: 100%;
  }
`;

const StyledHoldButton = styled(StyledButton) <{ pressed: boolean }>`
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

const GetMnemonicStep = ({
  useWalletCreateScreenReturn,
}: {
  useWalletCreateScreenReturn: UseWalletCreateReturn;
}): ReactElement => {
  const { seeds, onClickNext } = useWalletCreateScreenReturn;
  const theme = useTheme();
  const [showBlur, setShowBlur] = useState(true);
  const [onPress, setOnPress] = useState(false);
  const [ableToReveal, setAbleToReveal] = useState(false);
  const [agreeAbleToReveals, setAgreeAbleToReveals] = useState(false);
  const [checkSavedMnemonic, setCheckSavedMnemonic] = useState(false);
  const [copied, setCopied] = useState(false);

  const onClickCopy = (): void => {
    setCopied(true);
    navigator.clipboard.writeText(seeds);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (onPress) {
      timer = setTimeout(() => {
        setShowBlur(false);
      }, 3000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [onPress]);

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
          <Row style={{ justifyContent: 'center', columnGap: 12 }}>
            <StyledHoldButton
              figure='tertiary'
              size='small'
              onMouseDown={(): void => {
                setOnPress(true);
              }}
              onMouseUp={(): void => {
                setOnPress(false);
                setShowBlur(true);
              }}
              text='Hold to Reveal'
              textType='body6'
              pressed={onPress}
            />
            <StyledButton figure='tertiary' size='small' onClick={onClickCopy}>
              {copied ? (
                <WebText type='title6'>Copied!</WebText>
              ) : (
                <Row style={{ columnGap: 4 }}>
                  <WebImg src={IconCopy} size={14} />
                  <WebText type='title6'>Copy</WebText>
                </Row>
              )}
            </StyledButton>
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
          style={{ justifyContent: 'center' }}
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
