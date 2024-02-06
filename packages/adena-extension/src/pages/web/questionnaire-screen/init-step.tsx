import React from 'react';
import styled from 'styled-components';

import { View, WebButton } from '@components/atoms';
import LottieCompleteAQuestion from '@assets/web/lottie/complete-a-questionnaire.json';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  width: 100%;
  gap: 18px;
  align-items: center;
`;

interface QuestionnaireInitStepProps {
  initQuestion: () => void;
}

const QuestionnaireInitStep: React.FC<QuestionnaireInitStepProps> = ({ initQuestion }) => {
  return (
    <StyledContainer>
      <View style={{ width: '100%', alignItems: 'center', gap: 40 }}>
        <Lottie
          animationData={LottieCompleteAQuestion}
          height={120}
        />
        <WebTitleWithDescription
          title='Complete a Questionnaire'
          description={
            'Complete the following questionnaire to ensure that\nyou have sufficient understanding of wallet security.'
          }
          isCenter
        />
      </View>
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
