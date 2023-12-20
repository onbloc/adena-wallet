import React, { useCallback } from 'react';
import { UnderlineTextButtonWrapper } from './underline-text-button.styles';

export interface UnderlineTextButtonProps {
  text: string;
  onClick: () => void;
}

export const UnderlineTextButton: React.FC<UnderlineTextButtonProps> = ({ text, onClick }) => {
  const onClickButton = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <UnderlineTextButtonWrapper onClick={onClickButton}>
      <span className='title'>{text}</span>
    </UnderlineTextButtonWrapper>
  );
};
