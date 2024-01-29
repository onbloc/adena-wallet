import React from 'react';
import styled, { useTheme } from 'styled-components';
import Lottie from 'react-lottie';

import { View, WebButton, WebText } from '@components/atoms';
import LottieCompleteAQuestion from '@assets/web/lottie/complete-a-questionnaire.json';

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

interface QuestionnaireInitStepProps {
  initQuestion: () => void;
}

const QuestionnaireInitStep: React.FC<QuestionnaireInitStepProps> = ({
  initQuestion,
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
        <WebText type='headline2'>Complete a Questionnaire</WebText>
        <WebText type='body4' color={theme.webNeutral._500} textCenter>
          {'Complete the following questionnaire to ensure that\nyou have sufficient understanding of wallet security.'}
        </WebText>
      </StyledMessageBox>

      <WebButton
        figure='primary'
        size='small'
        onClick={initQuestion}
        text='Next'
        rightIcon='chevronRight'
      />
    </React.Fragment>
  );
};

export default QuestionnaireInitStep;
