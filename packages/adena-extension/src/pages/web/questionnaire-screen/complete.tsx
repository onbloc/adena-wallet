import React from 'react';
import styled, { useTheme } from 'styled-components';
import Lottie from 'react-lottie';

import { View, WebButton, WebText } from '@components/atoms';
import LottieCompleteAQuestion from '@assets/web/lottie/complete-a-questionnaire.json';

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

interface QuestionnaireCompleteProps {
  completeQuestion: () => void;
}

const QuestionnaireComplete: React.FC<QuestionnaireCompleteProps> = ({
  completeQuestion,
}) => {
  const theme = useTheme();

  return (
    <React.Fragment>
      <Lottie
        options={{
          animationData: LottieCompleteAQuestion,
        }}
        height={120}
      />
      <StyledMessageBox>
        <WebText type='headline2'>Questionnaire Complete</WebText>
        <WebText type='body4' color={theme.webNeutral._500} textCenter>
          {'You have successfully passed the questionnaire.\nClick on Next to continue.'}
        </WebText>
      </StyledMessageBox>

      <WebButton
        figure='primary'
        size='small'
        onClick={completeQuestion}
        text='Next'
        rightIcon='chevronRight'
      />
    </React.Fragment>
  );
};

export default QuestionnaireComplete;
