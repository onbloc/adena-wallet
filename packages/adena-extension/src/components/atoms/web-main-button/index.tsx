import React, { CSSProperties } from 'react';
import styled from 'styled-components';
import { View } from '../base';
import { WebButton } from '../web-button';
import { WebText } from '../web-text';
export interface WebMainButtonProps {
  buttonRef?: React.RefObject<HTMLButtonElement>;
  figure: 'primary' | 'secondary' | 'tertiary';
  text: string;
  width?: CSSProperties['width'];
  iconElement: JSX.Element;
  disabled?: boolean;
  onClick: () => void;
}

const StyledContainer = styled(WebButton)`
  flex-direction: column;
  height: 104px;
  padding: 12px 16px;
  align-items: flex-start;
  justify-content: space-between;
`;

const StyledImageWrapper = styled(View)`
  width: 24px;
  height: 24px;
  justify-content: center;

  svg {
    width: 100%;
  }
`;

const WebMainButton: React.FC<WebMainButtonProps> = ({
  buttonRef,
  iconElement,
  text,
  figure,
  width = '100%',
  disabled = false,
  onClick,
}) => {
  return (
    <StyledContainer
      buttonRef={buttonRef}
      style={{ width }}
      figure={figure}
      size='large'
      disabled={disabled}
      onClick={onClick}
    >
      <StyledImageWrapper>{iconElement}</StyledImageWrapper>
      <WebText type='title5' color='inherit'>
        {text}
      </WebText>
    </StyledContainer>
  );
};

export default WebMainButton;
