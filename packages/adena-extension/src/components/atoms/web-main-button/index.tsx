import React, { CSSProperties } from 'react';
import styled from 'styled-components';
import { View } from '../base';
import { WebButton } from '../web-button';
import { WebText } from '../web-text';

export interface WebMainButtonProps {
  buttonRef?: React.RefObject<HTMLButtonElement>;
  figure: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary';
  layout?: 'card' | 'list';
  listAlign?: 'start' | 'center';
  text: string;
  description?: string;
  width?: CSSProperties['width'];
  iconElement: JSX.Element;
  disabled?: boolean;
  onClick: () => void;
}

const StyledCardContainer = styled(WebButton)`
  flex-direction: column;
  height: 104px;
  padding: 12px 16px;
  align-items: flex-start;
  justify-content: space-between;
`;

const StyledListContainer = styled(WebButton)<{ $listAlign: 'start' | 'center' }>`
  flex-direction: row;
  align-items: ${({ $listAlign }): string => ($listAlign === 'center' ? 'center' : 'flex-start')};
  gap: 12px;
  padding: 12px 16px;
  height: auto;
`;

const StyledImageWrapper = styled(View)`
  width: 24px;
  height: 24px;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 100%;
  }
`;

const StyledListTextWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
  text-align: left;
`;

const descriptionColors: Record<string, string> = {
  primary: 'rgba(250, 252, 255, 0.6)',
  secondary: 'rgba(173, 202, 255, 0.6)',
  tertiary: 'rgba(188, 197, 214, 0.6)',
  quaternary: 'rgba(188, 197, 214, 0.6)',
  quinary: 'rgba(173, 202, 255, 0.6)',
};

const ChevronRight = (): JSX.Element => (
  <svg
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    style={{ flexShrink: 0 }}
  >
    <path
      d='M9 18L15 12L9 6'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      style={{ fill: 'none' }}
    />
  </svg>
);

const WebMainButton: React.FC<WebMainButtonProps> = ({
  buttonRef,
  iconElement,
  text,
  description,
  figure,
  layout = 'card',
  listAlign = 'start',
  width = '100%',
  disabled = false,
  onClick,
}) => {
  if (layout === 'list') {
    return (
      <StyledListContainer
        buttonRef={buttonRef}
        $listAlign={listAlign}
        style={{ width }}
        figure={figure}
        size='large'
        disabled={disabled}
        onClick={onClick}
      >
        <StyledImageWrapper>{iconElement}</StyledImageWrapper>
        <StyledListTextWrapper>
          <WebText type='title5' color='inherit'>
            {text}
          </WebText>
          {description && (
            <WebText type='body6' color={descriptionColors[figure] ?? 'rgba(255, 255, 255, 0.6)'}>
              {description}
            </WebText>
          )}
        </StyledListTextWrapper>
        <ChevronRight />
      </StyledListContainer>
    );
  }

  return (
    <StyledCardContainer
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
    </StyledCardContainer>
  );
};

export default WebMainButton;
