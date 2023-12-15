import React from 'react';
import styled from 'styled-components';

interface CircleProps {
  width?: string;
  height?: string;
  bgColor?: string;
  margin?: string;
}

const CircleStyle = styled.div<CircleProps>`
  width: ${({ width }): string | undefined => width && width};
  height: ${({ height }): string | undefined => height && height};
  background-color: ${({ theme, bgColor }): string => (bgColor ? bgColor : theme.color.neutral[4])};
  margin: ${({ margin }): string | undefined => margin && margin};
  border-radius: 50%;
`;

export const Circle = ({ width, height, bgColor, margin }: CircleProps): JSX.Element => {
  return <CircleStyle width={width} height={height} bgColor={bgColor} margin={margin} />;
};
