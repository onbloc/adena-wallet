import React from 'react';
import styled, { useTheme } from 'styled-components';
import Lottie from 'react-lottie';

import { View, WebButton, WebText } from '@components/atoms';
import LottieCompleteAQuestion from '@assets/web/lottie/complete-a-questionnaire.json';

const StyledContainer = styled(View)`
  width: 100%;
  gap: 24px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
  margin-top: 16px;
`;

interface QuestionnaireInitStepProps {
  initQuestion: () => void;
}

const QuestionnaireInitStep: React.FC<QuestionnaireInitStepProps> = ({
  initQuestion,
}) => {
  const theme = useTheme();

  return (
    <StyledContainer>
      <Lottie
        options={{
          animationData: LottieCompleteAQuestion,
        }}
        height={120}
      />
      <StyledMessageBox>
        <WebText type='headline2' textCenter>Complete a Questionnaire</WebText>
        <WebText type='body4' color={theme.webNeutral._500} textCenter>
          {'Complete the following questionnaire to ensure that\nyou have sufficient understanding of wallet security.'}
        </WebText>
      </StyledMessageBox>

      <WebButton
        figure='primary'
        size='small'
        text='Next'
        rightIcon='chevronRight'
        style={{ width: 'fit-content' }}
        onClick={initQuestion}
      />
    </StyledContainer>
  );
};

export default QuestionnaireInitStep;
