import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import { Question } from '@types';
import { WebMainHeader } from '@components/pages/web/main-header';
import WebAnswerButton from '@components/molecules/web-answer-button/web-answer-button';
import IconInfo from '@assets/web/info.svg';
import RollingNumber from '@components/atoms/rolling-number';
import { UseIndicatorStepReturn } from '@hooks/wallet/broadcast-transaction/use-indicator-step';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
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

const StyledWarningDescriptionWrapper = styled(Row)`
  margin-left: 1px;
  justify-content: flex-start;
  align-items: center;
`;

interface QuestionnaireQuestionProps {
  question: Question | null;
  indicatorInfo: UseIndicatorStepReturn;
  nextQuestion: () => void;
  backStep: () => void;
}

const QuestionnaireQuestion: React.FC<QuestionnaireQuestionProps> = ({
  question,
  indicatorInfo,
  nextQuestion,
  backStep,
}) => {
  const theme = useTheme();
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [retryTime, setRetryTime] = useState(0);

  const selectedAnswer = useMemo(() => {
    if (!question) {
      return null;
    }
    const selectedAnswer = question.answers.find((_, index) => selectedAnswerIndex === index);
    if (!selectedAnswer) {
      return null;
    }
    return selectedAnswer;
  }, [question, selectedAnswerIndex]);

  const isWarning = useMemo(() => {
    if (!selectedAnswer) {
      return false;
    }
    return selectedAnswer.correct === false;
  }, [selectedAnswer]);

  const isRetry = useMemo(() => {
    return retryTime > 0;
  }, [retryTime]);

  const availableNext = useMemo(() => {
    if (!question) {
      return false;
    }
    return selectedAnswer?.correct === true;
  }, [question, selectedAnswer]);

  const questionTitle = useMemo(() => {
    if (!question) {
      return '';
    }
    return `${question.index}. ${question.question}`;
  }, [question]);

  const answers = useMemo(() => {
    if (!question) {
      return [];
    }
    return question.answers;
  }, [question]);

  const selectAnswer = useCallback(
    (index: number) => {
      if (retryTime > 0) {
        return;
      }
      setSelectedAnswerIndex(index);
      setRetryTime(3);
    },
    [retryTime],
  );

  const onClickNextButton = useCallback(() => {
    if (availableNext) {
      nextQuestion();
    }
    setSelectedAnswerIndex(null);
    setRetryTime(0);
  }, [availableNext]);

  const onClickBack = useCallback(() => {
    setSelectedAnswerIndex(null);
    setRetryTime(0);
    backStep();
  }, [backStep]);

  useEffect(() => {
    function decreaseRetryTime(): void {
      setRetryTime(retryTime - 1);
    }

    if (isRetry) {
      const intervalId = setInterval(decreaseRetryTime, 1000);
      return () => clearInterval(intervalId);
    }
  }, [isRetry, retryTime]);

  return (
    <StyledContainer>
      <WebMainHeader
        currentStep={indicatorInfo.stepNo}
        stepLength={indicatorInfo.stepLength}
        onClickGoBack={onClickBack}
      />

      <WebTitleWithDescription title='Security Questionnaire' description={questionTitle} />

      <StyledAnswerBox>
        {answers.map((answer, index) => (
          <WebAnswerButton
            key={index}
            correct={answer.correct}
            answer={answer.answer}
            selected={selectedAnswerIndex === index}
            onClick={(): void => selectAnswer(index)}
          />
        ))}
      </StyledAnswerBox>

      {isWarning && (
        <StyledWarningBox>
          <WebImg src={IconInfo} size={20} />
          <StyledWarningTextWrapper>
            <WebText type='body6' color={theme.webWarning._100}>
              {isRetry
                ? 'Incorrect answer! Please try again in '
                : 'Incorrect answer! Please try again.'}
            </WebText>
            {isRetry && (
              <StyledWarningDescriptionWrapper>
                <RollingNumber
                  type='title6'
                  height={16}
                  color={theme.webWarning._100}
                  value={retryTime}
                />
                <WebText type='title6' color={theme.webWarning._100}>
                  {' seconds.'}
                </WebText>
              </StyledWarningDescriptionWrapper>
            )}
          </StyledWarningTextWrapper>
        </StyledWarningBox>
      )}

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
