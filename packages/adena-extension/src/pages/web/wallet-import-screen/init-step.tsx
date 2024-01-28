import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-rounded.svg';

import { View, WebButton, WebImg, WebText } from '@components/atoms';
import { UseWalletImportReturn } from '@hooks/web/use-wallet-import-screen';

const StyledContainer = styled(View)`
  row-gap: 24px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const InitStep = ({
  useWalletImportScreenReturn,
}: {
  useWalletImportScreenReturn: UseWalletImportReturn;
}): ReactElement => {
  const { onClickNext } = useWalletImportScreenReturn;
  const theme = useTheme();

  return (
    <StyledContainer>
      <WebImg src={IconAlert} />
      <StyledMessageBox>
        <WebText type='headline3'>Sensitive Information Ahead</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          {
            'You are about to import your seed phrase or private key on this device.\nWe recommend connecting with a hardware wallet for higher security.'
          }
        </WebText>
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

export default InitStep;
