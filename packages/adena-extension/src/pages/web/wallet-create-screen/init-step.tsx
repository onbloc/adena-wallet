import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-rounded.svg';

import { View, WebButton, WebImg, WebText } from '@components/atoms';
import { UseWalletCreateReturn } from '@hooks/web/use-wallet-create-screen';

const StyledContainer = styled(View)`
  row-gap: 24px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const InitStep = ({
  useWalletCreateScreenReturn,
}: {
  useWalletCreateScreenReturn: UseWalletCreateReturn;
}): ReactElement => {
  const { onClickNext } = useWalletCreateScreenReturn;
  const theme = useTheme();

  return (
    <StyledContainer>
      <WebImg src={IconAlert} />
      <StyledMessageBox>
        <WebText type='headline3'>Sensitive Information Ahead</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          {
            'This will generate a seed phrase on your device. Only proceed if you\nunderstand how to safely store your seed phrase.'
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
