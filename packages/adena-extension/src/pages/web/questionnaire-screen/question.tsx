import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import { Question } from '@types';
import { WebMainHeader } from '@components/pages/web/main-header';
import WebAnswerButton from '@components/molecules/web-answer-button/web-answer-button';
import IconInfo from '@assets/web/info.svg';

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

const StyledWarningBox = styled(Row)`
  width: 100%;
  padding: 12px;
  justify-content: flex-start;
  align-items: flex-end;
  gap: 8px;
  border-radius: 12px;
  border: 1px solid rgba(251, 194, 36, 0.08);
  background: rgba(251, 194, 36, 0.08);
`;

const StyledWarningTextWrapper = styled(Row)`
  justify-content: flex-start;
  align-items: center;
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
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [retryTime, setRetryTime] = useState(0);

  const isRetry = useMemo(() => {
    return retryTime > 0;
  }, [retryTime]);

  const availableNext = useMemo(() => {
    if (!question) {
      return false;
    }
    const correctAnswer = question.answers.find((answer, index) => answer.correct && selectedAnswers.includes(index));
    return correctAnswer ? true : false;
  }, [question, selectedAnswers]);

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

  const selectAnswer = useCallback((index: number) => {
    if (retryTime > 0) {
      return;
    }
    if (!selectedAnswers.includes(index)) {
      setSelectedAnswers([...selectedAnswers, index]);
      setRetryTime(3);
    }
  }, [retryTime, selectedAnswers]);

  const onClickNextButton = useCallback(() => {
    if (availableNext) {
      nextQuestion();
    }
    setSelectedAnswers([]);
  }, [availableNext]);


  useEffect(() => {
    function decreaseRetryTime(): void {
      setRetryTime(retryTime - 1);
    }

    if (isRetry) {
      const intervalId = setInterval(decreaseRetryTime, 1000);
      return () => clearInterval(intervalId);
    }
  }, [isRetry, retryTime])

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
            selected={selectedAnswers.includes(index)}
            onClick={(): void => selectAnswer(index)}
          />
        ))}
      </StyledAnswerBox>

      <StyledWarningBox>
        <WebImg src={IconInfo} size={20} />
        <StyledWarningTextWrapper>
          <WebText type='body6' color={theme.webWarning._100}>
            {isRetry ? 'Incorrect answer! Please try again in ' : 'Incorrect answer! Please try again.'}
          </WebText>
          <WebText type='title6' color={theme.webWarning._100}>{isRetry ? `${retryTime} seconds.` : ''}</WebText>
        </StyledWarningTextWrapper>
      </StyledWarningBox>

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
