import React from 'react';

import { StyledCorrectButton, StyledIncorrectButton } from './web-answer-button.styles';

export interface WebAnswerButtonProps {
  answer: string;
  correct: boolean;
  selected: boolean;
  onClick: () => void;
}

const WebAnswerButton: React.FC<WebAnswerButtonProps> = ({
  answer,
  correct,
  selected,
  onClick,
}) => {
  return correct ? (
    <StyledCorrectButton selected={selected} onClick={onClick}>
      {answer}
    </StyledCorrectButton>
  ) : (
    <StyledIncorrectButton selected={selected} onClick={onClick} >
      {answer}
    </StyledIncorrectButton>
  );
};

export default WebAnswerButton;