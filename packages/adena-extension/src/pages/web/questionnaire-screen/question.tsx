import React, { useCallback, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebButton, WebText } from '@components/atoms';
import { Question } from '@types';
import { WebMainHeader } from '@components/pages/web/main-header';
import WebAnswerButton from '@components/molecules/web-answer-button/web-answer-button';

const StyledContainer = styled(View)`
  width: 416px;
  row-gap: 24px;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledAnswerBox = styled(View)`
  width: 100%;
  row-gap: 16px;
`;

interface QuestionnaireQuestionProps {
  question: Question | null;
  nextQuestion: () => void;
  backStep: () => void;
}

const QuestionnaireQuestion: React.FC<QuestionnaireQuestionProps> = ({
  question,
  nextQuestion,
  backStep,
}) => {
  const theme = useTheme();
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);

  const availableNext = useMemo(() => {
    if (!question) {
      return false;
    }
    const currentAnswer = question.answers.find((_, index) => index === selectedAnswerIndex);
    return currentAnswer ? currentAnswer.correct : false;
  }, [question, selectedAnswerIndex]);

  const questionTitle = useMemo(() => {
    if (!question) {
      return '';
    }
    return question.question;
  }, [question]);

  const answers = useMemo(() => {
    if (!question) {
      return [];
    }
    return question.answers;
  }, [question]);

  const changeAnswerIndex = useCallback((index: number) => {
    setSelectedAnswerIndex(index);
  }, []);

  const onClickNextButton = useCallback(() => {
    if (availableNext) {
      nextQuestion();
    }
    setSelectedAnswerIndex(null);
  }, [availableNext]);

  return (
    <StyledContainer>
      <WebMainHeader
        currentStep={1}
        stepLength={4}
        onClickGoBack={backStep}
      />

      <StyledMessageBox>
        <WebText type='headline2'>Security Questionnaire</WebText>
        <WebText type='body3' color={theme.webNeutral._300}>
          {questionTitle}
        </WebText>
      </StyledMessageBox>

      <StyledAnswerBox>
        {answers.map((answer, index) => (
          <WebAnswerButton
            key={index}
            correct={answer.correct}
            answer={answer.answer}
            selected={index === selectedAnswerIndex}
            onClick={(): void => changeAnswerIndex(index)}
          />
        ))}
      </StyledAnswerBox>

      <WebButton
        figure='primary'
        size='small'
        text='Next'
        style={{ width: 116 }}
        rightIcon='chevronRight'
        disabled={!availableNext}
        onClick={onClickNextButton}
      />
    </StyledContainer>
  );
};

export default QuestionnaireQuestion;
