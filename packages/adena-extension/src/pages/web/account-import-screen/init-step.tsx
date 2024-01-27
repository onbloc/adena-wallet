import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-rounded.svg';

import { View, WebButton, WebImg, WebText } from '@components/atoms';
import { UseAccountImportReturn } from '@hooks/web/use-account-import-screen';

const StyledContainer = styled(View)`
  row-gap: 24px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const InitStep = ({
  useAccountImportScreenReturn,
}: {
  useAccountImportScreenReturn: UseAccountImportReturn;
}): ReactElement => {
  const { onClickNext } = useAccountImportScreenReturn;
  const theme = useTheme();

  return (
    <StyledContainer>
      <WebImg src={IconAlert} />
      <StyledMessageBox>
        <WebText type='headline3'>Sensitive Information Ahead</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          {
            'You are about to import your private key on this device. We recommend connecting with a hardware wallet for higher security.'
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
