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

interface QuestionnaireCompleteProps {
  completeQuestion: () => void;
}

const QuestionnaireComplete: React.FC<QuestionnaireCompleteProps> = ({ completeQuestion }) => {
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
        title='Questionnaire Complete'
        description={'You have successfully passed the questionnaire.\nClick on Next to continue.'}
        isCenter
      />

      <WebButton
        figure='primary'
        size='small'
        onClick={completeQuestion}
        text='Next'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default QuestionnaireComplete;
