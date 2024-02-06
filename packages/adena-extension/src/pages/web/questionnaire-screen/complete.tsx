import React from 'react';
import styled from 'styled-components';

import { View, WebButton } from '@components/atoms';
import LottieQuestionnaireComplete from '@assets/web/lottie/questionnaire-complete.json';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  width: 100%;
  gap: 18px;
  align-items: center;
`;

interface QuestionnaireCompleteProps {
  completeQuestion: () => void;
}

const QuestionnaireComplete: React.FC<QuestionnaireCompleteProps> = ({ completeQuestion }) => {
  return (
    <StyledContainer>
      <View style={{ width: '100%', alignItems: 'center', gap: 40 }}>
        <Lottie
          animationData={LottieQuestionnaireComplete}
          height={120}
        />
        <WebTitleWithDescription
          title='Questionnaire Complete'
          description={'You have successfully passed the questionnaire.\nClick on Next to continue.'}
          isCenter
        />
      </View>

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
