import React from 'react';
import styled from 'styled-components';

import { View, WebButton } from '@components/atoms';
import LottieCompleteAQuestion from '@assets/web/lottie/complete-a-questionnaire.json';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  width: 100%;
  gap: 24px;
  align-items: center;
`;

interface QuestionnaireInitStepProps {
  initQuestion: () => void;
}

const QuestionnaireInitStep: React.FC<QuestionnaireInitStepProps> = ({ initQuestion }) => {
  return (
    <StyledContainer>
      <View style={{ marginBottom: 16 }}>
        <Lottie
          animationData={LottieCompleteAQuestion}
          style={{ height: 120 }}
        />
      </View>
      <WebTitleWithDescription
        title='Complete a Questionnaire'
        description={
          'Complete the following questionnaire to ensure that\nyou have sufficient understanding of wallet security.'
        }
        isCenter
      />
      <WebButton
        figure='primary'
        size='small'
        text='Next'
        rightIcon='chevronRight'
        onClick={initQuestion}
      />
    </StyledContainer>
  );
};

export default QuestionnaireInitStep;
