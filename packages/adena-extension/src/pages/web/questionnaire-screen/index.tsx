import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebButton, WebMain, WebText } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const QuestionnaireScreen = (): ReactElement => {
  const { params, navigate } = useAppNavigate<RoutePath.WebQuestionnaire>();
  const { callbackPath } = params;
  const theme = useTheme();

  return (
    <WebMain>
      <StyledMessageBox>
        <WebText type='headline3'>Questionnaire Complete</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          This will be used to unlock your wallet.
        </WebText>
      </StyledMessageBox>

      <WebButton
        figure='primary'
        size='small'
        onClick={(): void => {
          navigate(callbackPath, { state: { doneQuestionnaire: true } });
        }}
        text='Next'
        rightIcon='chevronRight'
      />
    </WebMain>
  );
};

export default QuestionnaireScreen;
