import { WebFontType } from '@styles/theme';
import React, { useEffect, useState } from 'react';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';
import { View } from '../base';
import { WebText } from '../web-text';

export const StyledWrapper = styled(View) <{ active: boolean, height?: number }>`
  width: fit-content;
  height: ${({ height }): string => height ? `${height}px` : '1em'};
  flex-direction: column;
  overflow: hidden;

  @keyframes rolling-animation {
    from {
      transform: translate(0, 0);
    }

    to {
      transform: translate(0, -100%);
    }
  }

  ${({ active }): FlattenSimpleInterpolation | string => active ? css`
    & > * {
      animation: rolling-animation 0.2s linear forwards;
    }
  ` : ''}
`;


export interface RollingNumberProps {
  value: number;
  height?: number;
  type: WebFontType;
  color?: string;
  style?: React.CSSProperties;
  textCenter?: boolean;
}

const RollingNumber: React.FC<RollingNumberProps> = ({
  height,
  value,
  type,
  color,
  style,
  textCenter,
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (currentValue !== value) {
      setAnimated(true);
    }
  }, [value]);

  useEffect(() => {
    if (animated) {
      setTimeout(() => {
        setAnimated(false);
        setCurrentValue(value);
      }, 200);
    }
  }, [animated]);

  return (
    <StyledWrapper active={animated} height={height}>
      <WebText
        type={type}
        color={color}
        style={style}
        textCenter={textCenter}
      >
        {currentValue}
      </WebText>
      <WebText
        type={type}
        color={color}
        style={style}
        textCenter={textCenter}
      >
        {value}
      </WebText>
    </StyledWrapper>
  );
};

export default RollingNumber;