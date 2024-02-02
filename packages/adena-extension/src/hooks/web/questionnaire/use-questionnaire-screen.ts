import { useCallback, useMemo, useState } from 'react';

import useAppNavigate from '@hooks/use-app-navigate';
import { Question, RoutePath } from '@types';
import QuestionData from '@resources/questions/questions.json';
import useQuestionnaire from '../use-questionnaire';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';

export type UseQuestionnaireScreenReturn = {
  indicatorInfo: UseIndicatorStepReturn;
  questionnaireState: QuestionnaireStateType;
  question: Question | null;
  initQuestion: () => void;
  nextQuestion: () => void;
  completeQuestion: () => void;
  backStep: () => void;
};

export type QuestionnaireStateType = 'INIT' | 'QUESTION' | 'COMPLETE';

export const questionnaireStep: Record<
  QuestionnaireStateType,
  {
    backTo: QuestionnaireStateType | null;
    stepNo: number;
  }
> = {
  INIT: {
    backTo: null,
    stepNo: 0,
  },
  QUESTION: {
    backTo: 'INIT',
    stepNo: 1,
  },
  COMPLETE: {
    backTo: 'QUESTION',
    stepNo: 2,
  },
};

const useQuestionnaireScreen = (): UseQuestionnaireScreenReturn => {
  const { navigate, goBack, params } = useAppNavigate<RoutePath.WebQuestionnaire>();
  const { doneQuestionnaire } = useQuestionnaire();
  const [questionnaireState, setQuestionnaireState] = useState<QuestionnaireStateType>('INIT');
  const [questionIndex, setQuestionIndex] = useState(1);

  const indicatorInfo = useIndicatorStep({});

  const questions: Question[] = QuestionData;
  const { callbackPath } = params;

  const question = useMemo(() => {
    const question = questions.find((question) => question.index === questionIndex);
    if (question) {
      return question;
    }
    return null;
  }, [questions, questionIndex]);

  const initQuestion = useCallback(() => {
    setQuestionIndex(1);
    setQuestionnaireState('QUESTION');
  }, []);

  const nextQuestion = useCallback(() => {
    if (questionIndex >= questions.length) {
      setQuestionnaireState('COMPLETE');
      return;
    }
    setQuestionIndex(questionIndex + 1);
  }, [questions, questionIndex]);

  const completeQuestion = useCallback(() => {
    doneQuestionnaire().then(() => {
      navigate(callbackPath, { state: { doneQuestionnaire: true }, replace: true });
    });
  }, [callbackPath]);

  const backStep = useCallback(() => {
    if (questionnaireState === 'INIT') {
      navigate(callbackPath, { state: { doneQuestionnaire: false } });
      return;
    }
    if (questionnaireState === 'QUESTION') {
      if (questionIndex > 1) {
        setQuestionIndex(questionIndex - 1);
      } else {
        goBack();
      }
      return;
    }
    setQuestionIndex(1);
    setQuestionnaireState('INIT');
  }, [callbackPath, questionnaireState, questionIndex]);

  return {
    indicatorInfo: {
      stepNo: 1,
      stepLength: indicatorInfo.stepLength,
    },
    questionnaireState,
    question,
    initQuestion,
    nextQuestion,
    completeQuestion,
    backStep,
  };
};

export default useQuestionnaireScreen;
