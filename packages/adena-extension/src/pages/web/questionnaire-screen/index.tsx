import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';
import { WebMain } from '@components/atoms';
import useQuestionnaireScreen from '@hooks/web/questionnaire/use-questionnaire-screen';
import { ReactElement, useMemo } from 'react';

import QuestionnaireComplete from './complete';
import QuestionnaireInitStep from './init-step';
import QuestionnaireQuestion from './question';

const QuestionnaireScreen = (): ReactElement<any> => {
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
    return {
      default: WEB_TOP_SPACING,
      responsive: WEB_TOP_SPACING_RESPONSIVE,
    };
  }, [questionnaireState]);

  return (
    <WebMain
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      {questionnaireState === 'INIT' && <QuestionnaireInitStep initQuestion={initQuestion} />}
      {questionnaireState === 'QUESTION' && (
        <QuestionnaireQuestion
          question={question}
          indicatorInfo={indicatorInfo}
          nextQuestion={nextQuestion}
          backStep={backStep}
        />
      )}
      {questionnaireState === 'COMPLETE' && (
        <QuestionnaireComplete completeQuestion={completeQuestion} />
      )}
    </WebMain>
  );
};

export default QuestionnaireScreen;
