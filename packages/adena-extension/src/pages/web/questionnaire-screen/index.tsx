import { ReactElement, useMemo } from 'react';

import { WebMain } from '@components/atoms';
import useQuestionnaireScreen from '@hooks/web/questionnaire/use-questionnaire-screen';
import QuestionnaireInitStep from './init-step';
import QuestionnaireQuestion from './question';
import QuestionnaireComplete from './complete';

const QuestionnaireScreen = (): ReactElement => {
  const {
    indicatorInfo,
    questionnaireState,
    question,
    initQuestion,
    nextQuestion,
    completeQuestion,
    backStep,
  } = useQuestionnaireScreen();

  const topSpacing = useMemo(() => {
    if (questionnaireState === 'INIT' || questionnaireState === 'COMPLETE') {
      return null;
    }
    return 272;
  }, [questionnaireState])

  return (
    <WebMain spacing={topSpacing}>
      {questionnaireState === 'INIT' && (
        <QuestionnaireInitStep
          initQuestion={initQuestion}
        />)
      }
      {questionnaireState === 'QUESTION' && (
        <QuestionnaireQuestion
          question={question}
          indicatorInfo={indicatorInfo}
          nextQuestion={nextQuestion}
          backStep={backStep}
        />
      )}
      {questionnaireState === 'COMPLETE' && (
        <QuestionnaireComplete
          completeQuestion={completeQuestion}
        />
      )}
    </WebMain>
  );
};

export default QuestionnaireScreen;
