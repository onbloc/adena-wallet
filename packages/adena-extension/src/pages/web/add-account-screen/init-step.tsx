import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-rounded.svg';

import { View, WebButton, WebImg, WebText } from '@components/atoms';
import { UseAddAccountScreenReturn } from '@hooks/web/use-add-account-screen';

const StyledContainer = styled(View)`
  width: 540px;
  row-gap: 24px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const InitStep = ({
  useAddAccountScreenReturn,
}: {
  useAddAccountScreenReturn: UseAddAccountScreenReturn;
}): ReactElement => {
  const { onClickNext } = useAddAccountScreenReturn;
  const theme = useTheme();

  return (
    <StyledContainer>
      <WebImg src={IconAlert} />
      <StyledMessageBox>
        <WebText type='headline3'>Sensitive Information Ahead</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          {
            'You are about to add a new private key derived from your existing seed phrase. Be sure to store it in a safe place.'
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
