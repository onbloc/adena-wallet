import React from 'react';
import styled from 'styled-components';
import Lottie from 'react-lottie';

import { View, WebButton } from '@components/atoms';
import LottieCompleteAQuestion from '@assets/web/lottie/complete-a-questionnaire.json';
import { WebTitleWithDescription } from '@components/molecules';

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
          options={{
            animationData: LottieCompleteAQuestion,
          }}
          height={120}
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
        style={{ width: 'fit-content' }}
        onClick={initQuestion}
      />
    </StyledContainer>
  );
};

export default QuestionnaireInitStep;
